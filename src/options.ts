/*
 * Copyright (c) 2019 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ModelTransform } from '@yellicode/core';
import { RegionMarkerFormatter } from './region-marker-formatter';

/**
 * Specifies (from inside a template) how to deal with generating files that already exist.
 */
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
