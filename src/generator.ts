/*
 * Copyright (c) 2018 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as path from 'path';
import * as fs from 'fs';
import { IProcessMessage, ISetModelMessage } from '@yellicode/core';
import { ModelReader } from '@yellicode/elements';
import * as elements from '@yellicode/elements';
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
    /**
     * When true, no attempt will be made to parse the JSON data as a Yellicode model and the plain JSON
     * data will be returned.
     */
    noParse?: boolean;
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
     * Indicates what to do if the output file already exists. By default, the output file will be overwritten,
     * unless a diffent mode is configured in the 'outputMode' setting for this template in the codegenconfig.json. 
     * If outputMode has a value, the template configuration will be ignored. 
     */
    outputMode?: OutputMode;
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
    getModel<TSource = elements.Model, TTarget = TSource>(options?: CodeModelOptions<TSource, TTarget>): Promise<TTarget>;
    /**
     * Executes the specified code generation template with the model that is configured for the current template.
     * @param options The code generation options.
     */
    generateFromModel<TSourceModel = elements.Model, TTargetModel = TSourceModel>(options: ModelBasedCodeGenerationOptions<TSourceModel, TTargetModel>, template: (writer: TextWriter, model: TTargetModel) => void): void;
}

export enum OutputMode {
    /**
     * The output file will be truncated if it exists. This is the default value. 
     */
    Overwrite,
    /**
     * The output file will not be truncated if it already exists. Use this option if you want 
     * to update the file manually once it is generated.
     */
    Once,
    /**
     * The template output will be appended to the file if it already exists. The file is created if it 
     * does not exist.
     */
    Append
}

class InternalGenerator implements CodeGenerator {
    public templateArgs!: any | null;
    private outputMode: OutputMode = OutputMode.Overwrite;

    constructor() {
        //this.templateArgs = InternalGenerator.parseTemplateArgs(process.argv);
        this.parseProcessArgs(process.argv);
        const startedMessage: IProcessMessage = { cmd: 'processStarted' };
        this.sendProcessMessage(startedMessage);
    }

    private parseProcessArgs(args: string[]): void {
        for (let index = 0; index < args.length; index++) {
            const val = args[index];
            if (val === '--templateArgs') {
                this.templateArgs = InternalGenerator.parseTemplateArgs(args, index);
            }
            else if (val === '--outputMode') {
                this.outputMode = InternalGenerator.parseOutputMode(args, index) || this.outputMode;
            }
        }
    }

    private static parseOutputMode(args: string[], index: number): OutputMode | null {
        if (args.length <= index + 1)
            return null;

        const outputModeString = args[index + 1];
        switch (outputModeString) {
            case 'append':
                return OutputMode.Append;
            case 'once':
                return OutputMode.Once;
            case 'overwrite':
                return OutputMode.Overwrite;
            default:
                return null;
        }       
    }

    private static parseTemplateArgs(args: string[], index: number): any | null {
        if (args.length <= index + 1)
            return null;

        const templateArgsString = args[index + 1];
        if (templateArgsString.length > 0) {
            return JSON.parse(templateArgsString);
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
    public generateFromModel<TSourceModel = elements.Model, TTargetModel = TSourceModel>(
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
        const mode = options.outputMode === undefined ? this.outputMode : options.outputMode;       
        if (mode === OutputMode.Once && fs.existsSync(fullOutputFileName)) {
            // Don't regenerate the file
            var finishedMessage: IProcessMessage = { cmd: 'generateFinished' };
            this.sendProcessMessage(finishedMessage);
            return;
        }

        const flags:string = mode === OutputMode.Append ? 'a': 'w';
        const writeStream = fs.createWriteStream(fullOutputFileName, {flags: flags});
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
    public getModel<TSource = elements.Model, TTarget = TSource>(options?: CodeModelOptions<TSource, TTarget>): Promise<TTarget> {
        const codeModelOptions = options || {};
        const parseJson: boolean = codeModelOptions.noParse !== true;

        const promise = new Promise<TTarget>((resolve, reject) => {
            process.on('message', (m: ISetModelMessage) => {
                if (m.cmd !== 'setModel') {
                    return;
                }

                if (!m.modelData) {
                    return reject('The host returned an empty model. Please make sure that a model has been configured for this template.');
                }

                let model: TSource | null;
                // Should we parse the model into a Yellicode model?                                
                if (parseJson && ModelReader.canRead(m.modelData)) {
                    // The modelData will contain a Yellicode document with two main nodes: a 'model' node and an optional 'profiles' node.
                    // We need to parse the entire document (because profiles must be applied) and then return
                    // just the model part.
                    const document = ModelReader.readDocument(m.modelData);
                    if (document) {
                        model = document.model as any;
                    }
                    else model = null;
                }
                else model = m.modelData; // return plain JSON

                // Apply transforms                
                let targetModel: TTarget;
                if (model && codeModelOptions.modelTransform) {
                    targetModel = codeModelOptions.modelTransform.transform(model);
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
