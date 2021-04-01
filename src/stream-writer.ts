/*
 * Copyright (c) 2019 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

import { TextWriter } from '@yellicode/core';
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
    * The total number of lines currently written.
    */
    public loc: number = 0;
    /**
     * The total number of lines currently written, excluding comments and vertical space.
     */
    public sloc: number = 0;
    private countSloc: boolean = true;
    private noIndent: boolean = false;
    private noEndOfLine: boolean = false;

    /**
     * Constructor. Creates a new StreamWriter that writes to the provided WritableStream.
     * @param stream A Node.js WritableStream instance.
     * @param regionMarkerFormatter An optional RegionMarkerFormatter.
     */
    constructor(private stream: NodeJS.WritableStream, regionMarkerFormatter?: RegionMarkerFormatter) {
        this.templateDirName = path.resolve('.');
        this.fileRegionMapper = regionMarkerFormatter == null ? new DefaultRegionMarkerFormatter() : regionMarkerFormatter;
    }

    private incrementLoc(hasContents: boolean) {
        this.loc++;
        if (hasContents && this.countSloc) {
            this.sloc++;
        }
    }

    /******************************************************************************
     *                          TextWriter implementation
    ******************************************************************************/
    /**
    * Writes a new line to the output. The line is indented automatically. The line is ended with the endOfLineString.
    * @param value The line to write. When omitted, only the endOfLineString is written.
    */
    public writeLine(value?: string): this {
        if (value != null) {
            if (this.noEndOfLine)
                this.stream.write(this.createIndentString() + value);
            else
                this.stream.write(this.createIndentString() + value + this.endOfLineString);

            this.incrementLoc(true);
        }
        else {
            if (!this.noEndOfLine)
                this.stream.write(this.endOfLineString);

            this.incrementLoc(false);
        }
        return this;
    };

    /**
    * Writes a collection of lines to the output. Each line is indented automatically and ended with the endOfLineString.
    * @param values The lines to write.
    * @param delimiter An optional delimiter to be written at the end of each line, except for the last one.
    */
    public writeLines(values: string[], delimiter?: string): this {
        if (!values) return this;

        const len = values.length;
        values.forEach((value, index) => {
            this.stream.write(this.createIndentString() + value);
            if (delimiter && index < len - 1) {
                this.stream.write(delimiter);
            }
            if (!this.noEndOfLine) {
                this.stream.write(this.endOfLineString);
            }
            this.incrementLoc(value != null);
        });
        return this;
    }

    /**
     * Writes a new line to the output while temporarily increasing the indent. The line is ended with the endOfLineString.
     * @param value The line to write.
     */
    public writeLineIndented(value: string): this {
        const indentString = this.noIndent ? ''
            : this.indentString + this.createIndentString();

        if (this.noEndOfLine) {
            this.stream.write(indentString + value);
        }
        else {
            this.stream.write(indentString + value + this.endOfLineString);
        }

        this.incrementLoc(true);
        return this;
    }

    public writeEndOfLine(value?: string): this {
        if (value) {
            this.stream.write(value);
        }
        if (!this.noEndOfLine)  {
            this.stream.write(this.endOfLineString);
        }

        this.incrementLoc(true);
        return this;
    }

    public writeIndent(): this {
        if (!this.noIndent) {
            this.stream.write(this.createIndentString());
        }
        return this;
    };

    public write(value: string): this {
        if (value == null) return this; // avoid 'May not write null values to stream'
        this.stream.write(value);
        return this;
    };

    public writeWhiteSpace(): this {
        this.write(" ");
        return this;
    }

    public increaseIndent(): this {
        this.indent++;
        return this;
    }

    public decreaseIndent(): this {
        if (this.indent > 0) {
            this.indent--;
        }
        return this;
    }

    public clearIndent(): this {
        this.indent = 0;
        return this;
    }

    /**
    * Disables writing any indentation for following writeIndent() and writeLine() calls, until
    * resumeIndent() is called.
    */
    public suppressIndent(): this {
        this.noIndent = true;
        return this;
    }

    /**
     * Resumes writing indentation after a call to suppressIndent().
     */
    public resumeIndent(): this {
        this.noIndent = false;
        return this;
    }

    /**
     * Disables writing any end of line character for following and writeLine() calls, until
     * resumeEndOfLine() is called.
     */
    public suppressEndOfLine(): this {
        this.noEndOfLine = true;
        return this;
    }

    /**
    * Resumes writing end of line characters after a call to suppressEndOfLine().
    */
    public resumeEndOfLine(): this {
        this.noEndOfLine = false;
        return this;
    }

    public writeFile(path: string, encoding?: string): this {
        const fullPath = this.resolveFileName(path);
        const contents = this.readTextFile(fullPath, false, encoding);
        if (contents == null || contents.length <= 0)
            return this;

        this.stream.write(contents);
        return this;
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

    /**
   * Prevents the SLOC (source lines of code) counter from being incremented.
   */
    public freezeSloc(): this {
        this.countSloc = false;
        return this;
    }

    /**
    * Stops preventing the SLOC (source lines of code) counter from being incremented.
    */
    public unfreezeSloc(): this {
        this.countSloc = true;
        return this;
    }

    /**
     * Writes the contained contents without counting the lines as SLOC (source lines of code).
     * This is similar to calling freezeSloc() -> contents -> unfreezeSloc().
     * @param contents The code to write without increasing SLOC.
     */
    public withFrozenSloc(contents: (writer: this) => void): this {
        this.countSloc = false;
        if (contents) {
            contents(this);
        }
        this.countSloc = true;
        return this;
    }

    /******************************************************************************
     *                         End of TextWriter implementation
    ******************************************************************************/
    private createIndentString(): string {
        var result: string = "";
        if (this.noIndent)
            return result;

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