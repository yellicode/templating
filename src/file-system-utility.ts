/*
 * Copyright (c) 2018 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
const fs = require('fs');
const path = require('path');

export class FileSystemUtility {
    private static makeDirectoryRecursive(dir: string) {
        const baseDir = path.dirname(dir);
        // Base dir exists, no recursion necessary
        if (fs.existsSync(baseDir)) {
            fs.mkdirSync(dir, parseInt('0777', 8));
            return;
        }

        // Base dir does not exist, go recursive
        FileSystemUtility.makeDirectoryRecursive(baseDir);

        // Base dir created, can create dir
        fs.mkdirSync(dir, parseInt('0777', 8));
    }

    public static ensureDirectory(dir: string) {
        if (fs.existsSync(dir)) {
            return;
        }
        FileSystemUtility.makeDirectoryRecursive(dir);
    }
}