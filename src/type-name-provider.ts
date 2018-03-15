/*
 * Copyright (c) 2018 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as model from "@yellicode/model";

/**
 * Defines the interface for classes that create type names for types in a model.
 * This interface is implemented by the DefaultTypeNameProvider, which can be extended
 * to provide language-specific type names.
 */
export interface TypeNameProvider {
    /**
     * Gets the name of the type. If the name could not be determined, this function returns null.
     */
    getTypeName(type: model.Type): string | null;
}

/**
 * Default implementation of the TypeNameProvider interface. This implementation 
 * returns type names as-is but allows inheritors to map primitive types 
 * and other types separately.
 */
export class DefaultTypeNameProvider implements TypeNameProvider {
    public getTypeName(type: model.Type): string | null {
        if (model.isPrimitiveType(type)) {
            return this.getPrimitiveTypeName(type);
        }
        else return this.getComplexTypeName(type);
    }

    /**
     * Returns the name of the provided primitive type. Override this function to
     * map primitive type names (both built-in or types exported from a profile)
     * to the target language.
     * @param type The type information.
     */
    protected /*virtual*/ getPrimitiveTypeName(type: model.PrimitiveType): string | null {
        return type.name;
    }

    /**
     * Returns the name of the provided complex type (any type that is not a primitive). Override this function to provide
     * a custom name for the complex type.
     * @param type The type information.
     */
    protected /*virtual*/ getComplexTypeName(type: model.Type): string | null {
        return type.name;
    }
}