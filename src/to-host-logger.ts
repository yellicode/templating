/*
 * Copyright (c) 2019 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Logger, IProcessMessage, LogLevel } from '@yellicode/core';

/**
 * Uses the active host process logger for log message.
 */
export class ToHostLogger implements Logger {
    public log(message: string, level: LogLevel) {
        const processMessage: IProcessMessage = { log: { level: level, message: message } };
        (process as any).send(processMessage); // https://github.com/Microsoft/TypeScript/issues/10158
    }

    public verbose(message: string): void {
        this.log(message, LogLevel.Verbose);
    }

    public info(message: string): void {
        this.log(message, LogLevel.Info);
    }

    public warn(message: string): void {
        this.log(message, LogLevel.Warning);
    }

    public error(message: string): void {
        this.log(message, LogLevel.Error);
    }
}