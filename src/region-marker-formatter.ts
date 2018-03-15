/*
 * Copyright (c) 2018 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Represents a class that formats file region names into a start- and end marker string. 
 * These markers are used to embed parts of other files (regions) in the generated code. 
 */
export interface RegionMarkerFormatter {
    /**
     * Gets a string that uniquely identifies the start of a region.
     * @param regionName The name of the region.
     * @returns A formatted string.
     */
    getRegionStartMarker(regionName: string): string;
    /**
     * Gets a string that uniquely identifies the end of a region.
     * @param regionName The name of the region.
     * @returns A formatted string.
     */
    getRegionEndMarker(regionName: string): string;
}

/**
 * The default implementation of the FileRegionMapper interface. 
 * Uses the format "/// &lt;${regionName}&gt; ... /// &lt;/${regionName}&gt;". 
 */
export class DefaultRegionMarkerFormatter implements RegionMarkerFormatter {
    /**
    * Gets a string that uniquely identifies the start of a region.
    * @param regionName The name of the region.
    * @returns A string in the format "/// &lt;${regionName}&gt;".
    */
    public getRegionStartMarker(regionName: string): string {
        return `/// <${regionName}>`;
    }

    /**
    * Gets a string that uniquely identifies the end of a region.
    * @param regionName The name of the region.
    * @returns A string in the format "/// &lt;/${regionName}&gt;".
    */
    public getRegionEndMarker(regionName: string): string {
        return `/// </${regionName}>`;
    }
}