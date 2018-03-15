/*
 * Copyright (c) 2018 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

import { TextWriter } from './text-writer';
import { RegionMarkerFormatter, DefaultRegionMarkerFormatter } from './region-marker-formatter';

/**
 * Internal writer class that is passed to WriterBase implementations. We don't let people inherit from TextWriter directly because
 * we want to control the instantiation and lifetime of each StreamWriter instance.
 */

export class StreamWriter implements TextWriter {
    private indent: number = 0;
    private templateDirName: string;
    private textFileCache: { [path: string]: string | null } = {};
    private fileRegionMapper: RegionMarkerFormatter;

    public endOfLineString = os.EOL;
    public indentString = "\t";

    /**
     * Constructor. Creates a new StreamWriter that writes to the provided WritableStream.
     * @param stream A Node.js WritableStream instance. 
     * @param regionMarkerFormatter An optional RegionMarkerFormatter.
     */
    constructor(private stream: NodeJS.WritableStream, regionMarkerFormatter?: RegionMarkerFormatter) {
        this.templateDirName = path.resolve('.');
        this.fileRegionMapper = regionMarkerFormatter == null ? new DefaultRegionMarkerFormatter() : regionMarkerFormatter;
    }

    /******************************************************************************
     *                          TextWriter implementation
    ******************************************************************************/
    /**
    * Writes a new line to the output. The line is indented automatically. The line is ended with the endOfLineString.
    * @param value The line to write.     
    */
    public writeLine(value: string) {
        this.stream.write(this.createIndentString() + value + this.endOfLineString);
    };

    /**
    * Writes a collection of lines to the output. Each line is indented automatically and ended with the endOfLineString.
    * @param values The lines to write.   
    * @param delimiter An optional delimiter to be written at the end of each line, except for the last one.
    */
    public writeLines(values: string[], delimiter?: string): void {
        if (!values) return;

        const len = values.length;
        values.forEach((value, index) => {
            this.stream.write(this.createIndentString() + value);
            if (delimiter && index < len - 1) {
                this.stream.write(delimiter);
            }
            this.stream.write(this.endOfLineString);
        });
    }

    /**
     * Writes a new line to the output while temporarily increasing the indent. The line is ended with the endOfLineString.
     * @param value The line to write.     
     */
    public writeLineIndented(value: string): void {
        this.stream.write(this.indentString + this.createIndentString() + value + this.endOfLineString);
    }

    public writeEndOfLine(value?: string) {
        if (value) {
            this.stream.write(value);
        }
        this.stream.write(this.endOfLineString);
    }

    public writeIndent() {
        this.stream.write(this.createIndentString());
    };

    public write(value: string) {
        if (value == null) return; // avoid 'May not write null values to stream'
        this.stream.write(value);
    };

    public writeWhiteSpace(): void {
        this.write(" ");
    }

    public increaseIndent() {
        this.indent++;
    }

    public decreaseIndent() {
        if (this.indent > 0) {
            this.indent--;
        }
    }

    public clearIndent() {
        this.indent = 0;
    }

    public writeFile(path: string, encoding?: string) {
        const fullPath = this.resolveFileName(path);
        const contents = this.readTextFile(fullPath, false, encoding);
        if (contents == null || contents.length <= 0)
            return;

        this.stream.write(contents);
    }

    public writeFileRegion(regionName: string, path: string, encoding?: string): boolean {
        if (this.fileRegionMapper == null || regionName == null || regionName.length === 0 || path == null || path.length === 0)
            return false;

        const fullPath = this.resolveFileName(path);
        const contents = this.readTextFile(fullPath, true, encoding);

        if (contents == null || contents.length <= 0)
            return false;

        // First find the region match 
        const regionStartMarker = this.fileRegionMapper.getRegionStartMarker(regionName);
        const regionStartIndex = contents.indexOf(regionStartMarker);
        if (regionStartIndex < 0) {
            return false;
        }

        const regionEndMarker = this.fileRegionMapper.getRegionEndMarker(regionName);
        const regionEndIndex = contents.indexOf(regionEndMarker, regionStartIndex);
        if (regionEndIndex < 0) {
            return false;
        }

        var region = contents.substring(regionStartIndex + regionStartMarker.length, regionEndIndex);
        this.stream.write(region);
        this.writeEndOfLine();
        return true;
    }

    /******************************************************************************
     *                         End of TextWriter implementation
    ******************************************************************************/
    private createIndentString(): string {
        var result: string = "";
        for (let i = 0; i < this.indent; i++) {
            result += this.indentString;
        }
        return result;
    };

    private resolveFileName(fileName: string) {
        return path.join(this.templateDirName, fileName);
    }

    private readTextFile(path: string, useCache: boolean, encoding?: string): string | undefined {
        if (useCache && this.textFileCache.hasOwnProperty(path)) {
            return this.textFileCache[path]!;
        }

        if (!fs.existsSync(path)) {
            //  this.writeLine(`Cannot write the contents of file '${fullPath}' because the file does not exist.`);
            if (useCache) {
                this.textFileCache[path] = null;
            }
            return undefined;
        }

        if (encoding != null) {
            encoding = encoding.toLowerCase();
        } else encoding = 'utf-8';

        var contents: string = fs.readFileSync(path, encoding);
        if (contents == null || contents.length === 0)
            return undefined;

        // Remove any utf-8 BOM if there is any
        if (encoding === 'utf-8' && contents.charCodeAt(0) === 0xFEFF) {
            contents = contents.slice(1);
        }

        if (useCache) {
            this.textFileCache[path] = contents;
        }
        return contents;
    }
}