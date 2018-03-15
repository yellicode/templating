/*
 * Copyright (c) 2018 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
const fs = require('fs');
const path = require('path');
import { IProcessMessage, ISetModelMessage } from '@yellicode/core';
import { ModelReader } from '@yellicode/model';
import * as model from '@yellicode/model';
import { StreamWriter } from './stream-writer';
import { TextWriter } from './text-writer';
import { RegionMarkerFormatter } from './region-marker-formatter';
import { FileSystemUtility } from './file-system-utility';
import { ModelTransform } from "./transforms/model-transform";

/**
 * Defines the options for retrieving a model to be used as input for code generation.
 */
export interface CodeModelOptions<TSource, TTarget> {
    /**
     * Specifies an optional model transform that is applied to the model before it is returned.
     */
    modelTransform?: ModelTransform<TSource, TTarget>;
}

/**
 * Defines the options for generating a code file with the CodeGenerator.
 */
export interface CodeGenerationOptions {
    /**
     * The path of the output file, relative to the template file.
     */
    outputFile: string;
    /**
     * Provides an optional RegionMarkerFormatter that provides region start- and end markers based on a region name.
     * Region markers must be used in files that must to be merged with generated code.
     * If not specified, the default region marker format is used.
     */
    regionMarkerFormatter?: RegionMarkerFormatter;
}

/**
 * Combines the CodeGenerationOptions and CodeModelOptions for the generateFromModel function.
 */
export interface ModelBasedCodeGenerationOptions<TModel, TTargetModel> extends CodeGenerationOptions, CodeModelOptions<TModel, TTargetModel> {

}

/**
 * The primary interface for code generation using a template. An instance can be 
 * obtained by importing the exported "Generator" constant into the template.
 */
export interface CodeGenerator {
    /**
     * Gets any template arguments that were configured for the template instance in the codegenconfig.json file. 
     */
    templateArgs: any | null;
    /**
     * Executes the specified code generation template without any model.
     * @param options The code generation options.
     */
    generate(options: CodeGenerationOptions, template: (writer: TextWriter) => void): void;
    /**
     * Gets the model that is configured for the current template.
     * @param options The model options.
     */
    getModel<TSource = model.Model, TTarget = TSource>(options?: CodeModelOptions<TSource, TTarget>): Promise<TTarget>;
    /**
     * Executes the specified code generation template with the model that is configured for the current template.
     * @param options The code generation options.
     */
    generateFromModel<TSourceModel = model.Model, TTargetModel = TSourceModel>(options: ModelBasedCodeGenerationOptions<TSourceModel, TTargetModel>, template: (writer: TextWriter, model: TTargetModel) => void): void;
}

class InternalGenerator implements CodeGenerator {
    public templateArgs: any | null;
    
    constructor() {
        this.templateArgs = InternalGenerator.parseTemplateArgs();
        const startedMessage: IProcessMessage = { cmd: 'processStarted' };
        this.sendProcessMessage(startedMessage);
    }

    private static parseTemplateArgs(): any | null {
        const args = process.argv;
        for (let index = 0; index < args.length; index++) {
            const val = args[index];            
            if (val === '--templateArgs' && args.length > index + 1) {
                const templateArgsString = args[index + 1];
                if (templateArgsString.length > 0) {
                    return JSON.parse(templateArgsString);
                }
            }
        } 
        return null;      
    }

    private sendProcessMessage(message: IProcessMessage) {
        (process as any).send(message); // https://github.com/Microsoft/TypeScript/issues/10158        
    }
    /**
       * Executes the provided template.
       */
    public generate(options: CodeGenerationOptions, template: (writer: TextWriter) => void): void {
        this.generateInternal(options, template);
    }

    /**
     * Executes the provided template using the model that was configured in the code generation configuration. 
     */
    public generateFromModel<TSourceModel = model.Model, TTargetModel = TSourceModel>(
        options: ModelBasedCodeGenerationOptions<TSourceModel, TTargetModel>,
        template: (writer: TextWriter, model: TTargetModel) => void): void {

        this.getModel(options)
            .then((model) => {
                this.generateInternal(options, (writer: TextWriter) => {
                    template(writer, model);
                });
            }).catch((err) => {
                console.log(err);
            });
    }

    private generateInternal<TModel>(options: CodeGenerationOptions, callback: (writer: TextWriter) => void): void {
        // Get the working directory. The host will make sure that this is the directory in which the template resides.
        const templateDirName = path.resolve('./');
        // console.log('Generator: Template directory name is \'%s\'', templateDirName);
        const fullOutputFileName = path.join(templateDirName, options.outputFile);
        // Ensure that the directory exists        
        FileSystemUtility.ensureDirectory(path.dirname(fullOutputFileName));

        // Let the host know that we started something so that we don't get killed
        var startedMessage: IProcessMessage = { cmd: 'generateStarted' };
        this.sendProcessMessage(startedMessage);
        // console.log('Generator: Generating file \'%s\'...', fullOutputFileName);

        const writeStream = fs.createWriteStream(fullOutputFileName);
        writeStream.once('open', (fd: number) => {
            var cw = new StreamWriter(writeStream, options.regionMarkerFormatter);
            callback(cw);
            writeStream.end();
            // console.log('Generator: Finished generating \'%s\'...', fullOutputFileName);
            // Let the host know that we are done
            var finishedMessage: IProcessMessage = { cmd: 'generateFinished' };
            this.sendProcessMessage(finishedMessage);
        });
    }

    /**
    * Loads the model that was configured in the code generation configuration. 
    */
    public getModel<TSource = model.Model, TTarget = TSource>(options?: CodeModelOptions<TSource, TTarget>): Promise<TTarget> {
        const promise = new Promise<TTarget>((resolve, reject) => {
            process.on('message', (m: ISetModelMessage) => {
                if (m.cmd !== 'setModel') {
                    return;
                }

                //console.info("Generator: Received model");
                if (!m.modelData) {
                    //                    return resolve(null);
                    return reject('The host returned an empty model. Please make sure that a model has been configured for this template.');
                }

                let model: TSource;
                // Is this a Yellicode model or a plain JSON model?                
                if (ModelReader.canRead(m.modelData)) {
                    const modelReader = new ModelReader();
                    model = <any>modelReader.read(m.modelData);
                }
                else model = m.modelData; // the model is another json file                       

                let targetModel: TTarget;
                // Apply transforms                
                if (options && options.modelTransform) {
                    targetModel = options.modelTransform.transform(model);
                }
                else targetModel = <any>model as TTarget;
                resolve(targetModel);
            });

        })

        var getModelMessage: IProcessMessage = { cmd: 'getModel' };
        this.sendProcessMessage(getModelMessage);
        return promise;
    }
}

export const Generator = new InternalGenerator() as CodeGenerator;
