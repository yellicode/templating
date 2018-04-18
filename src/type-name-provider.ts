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
     * Gets the name of the typed element's type. If the name could not be determined, this function returns null.
     */
    getTypeName(typedElement: model.TypedElement): string | null;
}

/**
 * Default implementation of the TypeNameProvider interface. This implementation 
 * returns type names as-is but allows inheritors to map data types 
 * and other types separately.
 */
export class DefaultTypeNameProvider implements TypeNameProvider {
    public getTypeName(typedElement: model.TypedElement): string | null {
        if (!typedElement.type) return null;
        return model.isDataType(typedElement.type) ? 
            this.getDataTypeName(typedElement) : 
            this.getComplexTypeName(typedElement);
    }

    /**
     * Returns the name of the provided data type. Override this function to map primitives and other data types 
     * (both built-in or types exported from a profile) to the target language.
     * @param type The type information.
     */
    protected /*virtual*/ getDataTypeName(typedElement: model.TypedElement): string | null {
        return typedElement.getTypeName();
    }

    /**
     * Returns the name of the provided complex type (any type that is not a data). Override this function to provide
     * a custom name for the complex type.
     * @param type The type information.
     */
    protected /*virtual*/ getComplexTypeName(typedElement: model.TypedElement): string | null {
        return typedElement.getTypeName();
    }
}