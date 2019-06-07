/*
 * Copyright (c) 2019 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as path from 'path';
import * as fs from 'fs';
import { IProcessMessage, ISetModelMessage, Logger } from '@yellicode/core';
import { ModelReader } from '@yellicode/elements';
import * as elements from '@yellicode/elements';
import { StreamWriter } from './stream-writer';
import { TextWriter } from './text-writer';
import { FileSystemUtility } from './file-system-utility';
import { CodeGenerator } from './code-generator';
import { OutputMode, CodeGenerationOptions, ModelBasedCodeGenerationOptions, CodeModelOptions } from './options';
import { ToHostLogger } from './to-host-logger';

class InternalGenerator implements CodeGenerator {
    public templateArgs!: any | null;
    private outputMode: OutputMode = OutputMode.Overwrite;
    private modelBuilderResult: any | null = null;
    private modelBuilderPromise: Promise<any> | null = null;   
    private logger: Logger;

    constructor() {        
        this.parseProcessArgs(process.argv);
        const startedMessage: IProcessMessage = { cmd: 'processStarted' };
        this.sendProcessMessage(startedMessage);
        this.logger = new ToHostLogger();
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

    public generate(options: CodeGenerationOptions, template: (writer: TextWriter) => void): void {        
        this.generateInternal(options, (writer: TextWriter) => {
            template(writer);
            return Promise.resolve();
        });
    }

    public generateAsync(options: CodeGenerationOptions, template: (writer: TextWriter) => Promise<void>): void {
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
                    return Promise.resolve();
                });
            }).catch((err) => {
                console.log(err);
            });
    }

    public generateFromModelAsync<TSourceModel = elements.Model, TTargetModel = TSourceModel>(
        options: ModelBasedCodeGenerationOptions<TSourceModel, TTargetModel>,
        template: (writer: TextWriter, model: TTargetModel) => Promise<void>): void {

        this.getModel(options)
            .then((model) => {
                this.generateInternal(options, (writer: TextWriter) => {
                    return template(writer, model);
                });
            }).catch((err) => {
                console.log(err);
            });
    }

    private generateInternal(options: CodeGenerationOptions, callback: (writer: TextWriter) => Promise<void>): void {
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
            callback(cw)
                .then(() => {
                    writeStream.end();
                    // console.log('Generator: Finished generating \'%s\'...', fullOutputFileName);
                    // Let the host know that we are done
                    var finishedMessage: IProcessMessage = { cmd: 'generateFinished' };
                    this.sendProcessMessage(finishedMessage);
                });
        });
    }

    /**
    * Loads the model that was configured in the code generation configuration. 
    */
    public getModel<TSource = elements.Model, TTarget = TSource>(options?: CodeModelOptions<TSource, TTarget>): Promise<TTarget> {
        const codeModelOptions = options || {};
        const parseJson: boolean = codeModelOptions.noParse !== true;

        if (this.modelBuilderResult || this.modelBuilderPromise) {
            return this.getModelFromModelBuilder(options);
        }

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

    private getModelFromModelBuilder<TSource = elements.Model, TTarget = TSource>(options?: CodeModelOptions<TSource, TTarget>): Promise<TTarget> {        
        const codeModelOptions = options || {};
        const applyTransform = (model: TSource): TTarget => {            
            if (model && codeModelOptions.modelTransform) {
                return codeModelOptions.modelTransform.transform(model);
            }
            return <any>model as TTarget;
        };
        if (this.modelBuilderResult) {
            // this.logger.verbose('getModelFromModelBuilder: returning current modelBuilderResult.');            
            return Promise.resolve(applyTransform(this.modelBuilderResult));
        }
        else if (this.modelBuilderPromise) {
            // this.logger.verbose('getModelFromModelBuilder: waiting for modelBuilderPromise.');
            return this
                .modelBuilderPromise
                .then(((m) => {
                    // this.logger.verbose('getModelFromModelBuilder: modelBuilderPromise done.');
                    return applyTransform(m);
                } ));
        }
        else return Promise.reject('An unexpected internal error has occured.'); // either modelBuilderResult or modelBuilderPromise will have a value, see getModel
    }

    public buildModel<TSource = elements.Model>(builder: () => Promise<TSource>): Promise<TSource> {               
        // We need to signal the CLI that we started something async and that is should not kill us.
        // Use the 'generateStarted' / 'generateFinished' commands for now, although we should really use a different command.        
        this.logger.verbose(`Generator.buildModel starting...`);
        this.sendProcessMessage({ cmd: 'generateStarted' });

        // Set up a promise to be returned to the caller, althoug it is optional to use it.
        let resolveFunctionPromise: Function;
        let rejectFunctionPromise: Function;  
        const functionPromise = new Promise<TSource>((resolve, reject) => {
            // resolve when builder resolves
            resolveFunctionPromise = resolve;
            rejectFunctionPromise = reject;
        });
        this.modelBuilderResult = null;
        this.modelBuilderPromise = builder()
            .then((result) => {                
                this.modelBuilderResult = result;                
                // var d2 = new Date();
                // this.logger.verbose(`${d2.getMinutes()}:${d2.getMilliseconds()}: buildModel finished`);
                this.logger.verbose(`Generator.buildModel finished.`);
                resolveFunctionPromise(result);
                // Let the host know that we are 'done'                
                this.sendProcessMessage({ cmd: 'generateFinished' });
                return result;
            })
            .catch((e) => rejectFunctionPromise(e));

        return functionPromise;     
    }
}

export const Generator = new InternalGenerator() as CodeGenerator;
