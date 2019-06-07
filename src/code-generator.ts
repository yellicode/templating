/*
 * Copyright (c) 2019 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as elements from '@yellicode/elements';
import { CodeGenerationOptions, CodeModelOptions, ModelBasedCodeGenerationOptions } from './options';
import { TextWriter } from './text-writer';

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
     * @param template A callback function that writes code to the provided TextWriter.
     */
    generate(options: CodeGenerationOptions, template: (writer: TextWriter) => void): void;
    /**
     * Executes the specified code generation template without any model. 
     * @param options The code generation options.
     * @param template A callback function that writes code to the provided TextWriter. This callback should
     * return a Promise<void> when writing has finished.
     */
    generateAsync(options: CodeGenerationOptions, template: (writer: TextWriter) => Promise<void>): void;
    /**
     * Gets the model that is configured for the current template.
     * @param options The model options.
     */
    getModel<TSource = elements.Model, TTarget = TSource>(options?: CodeModelOptions<TSource, TTarget>): Promise<TTarget>;
    
    /**
     * Builds a model using a custom function. Use this function when you cannot configure a model file
     * but want to build a model from the template instead.
     * @param builder A custom function that builds the model.
     */
    buildModel<TSource = elements.Model>(builder: () => Promise<TSource>): Promise<TSource>;

    /**
     * Executes the specified code generation template with the model that is configured for the current template.
     * @param options The code generation options.
     */
    generateFromModel<TSourceModel = elements.Model, TTargetModel = TSourceModel>(options: ModelBasedCodeGenerationOptions<TSourceModel, TTargetModel>, template: (writer: TextWriter, model: TTargetModel) => void): void;
    /**
     * Executes the specified code generation template with the model that is configured for the current template.
     * @param options The code generation options.
     * @param template A callback function that writes code to the provided TextWriter. This callback should
     * return a Promise<void> when writing has finished. 
     */
    generateFromModelAsync<TSourceModel = elements.Model, TTargetModel = TSourceModel>(options: ModelBasedCodeGenerationOptions<TSourceModel, TTargetModel>, template: (writer: TextWriter, model: TTargetModel) => Promise<void>): void;
}