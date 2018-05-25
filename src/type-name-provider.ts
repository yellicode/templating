/*
 * Copyright (c) 2018 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as elements from "@yellicode/elements";

/**
 * Defines the interface for classes that create type names for types in a model.
 * This interface is implemented by the DefaultTypeNameProvider, which can be extended
 * to provide language-specific type names.
 */
export interface TypeNameProvider {
    /**
     * Gets the name of the typed type. If the name could not be determined, this function returns null.
     */
    getTypeName(type: elements.Type): string | null;
    
    /**
     * Gets the name of the typed element's type. If the name could not be determined, this function returns null.
     */
    getTypeName(typedElement: elements.TypedElement): string | null;
}

/**
 * Default implementation of the TypeNameProvider interface. This implementation 
 * returns type names as-is but allows inheritors to map data types 
 * and other types separately.
 */
export class DefaultTypeNameProvider implements TypeNameProvider {
    public getTypeName(type: elements.Type): string | null;
    public getTypeName(typedElement: elements.TypedElement): string | null;
    public getTypeName(typeOrTypedElement: elements.Type | elements.TypedElement): string | null {
        if (elements.isTypedElement(typeOrTypedElement)) {
            // The argument is a typedElement            
            return elements.isDataType(typeOrTypedElement.type) ? this.getDataTypeName(typeOrTypedElement) : this.getComplexTypeName(typeOrTypedElement);
        }
        else {
            // The argument is a type
            return elements.isDataType(typeOrTypedElement) ? this.getDataTypeNameForType(typeOrTypedElement) : this.getComplexTypeNameForType(typeOrTypedElement);
        }
    }

    /**
     * Returns the name of the provided element's data type. Override this function to map primitives and other data types 
     * (both built-in or types exported from a profile) to the target language. The default implementation calls the 
     * getDataTypeNameForType function using the type of the typedElement.
     * @param typedElement Any TypedElement instance.
     */
    protected /*virtual*/ getDataTypeName(typedElement: elements.TypedElement): string | null {
        return this.getDataTypeNameForType(typedElement.type);
    }

     /**
     * Returns the name of the provided data type. Override this function to map primitives and other data types 
     * (both built-in or types exported from a profile) to the target language.
     * @param type The type information.
     */
    protected /*virtual*/ getDataTypeNameForType(type: elements.Type | null): string | null {
        return type ? type.name : null;
    }

    /**
     * Returns the name of the provided element's complex type (any type that is not a DataType). Override this function to provide
     * a custom name for the complex type. The default implementation calls the getComplexTypeNameForType function using 
     * the type of the typedElement.
     * @param typedElement Any TypedElement instance.
     */
    protected /*virtual*/ getComplexTypeName(typedElement: elements.TypedElement): string | null {
        return this.getComplexTypeNameForType(typedElement.type);
    }

      /**
     * Returns the name of the provided complex type (any type that is not a DataType). Override this function to provide
     * a custom name for the complex type.
     * @param type The type information.
     */
    protected /*virtual*/ getComplexTypeNameForType(type: elements.Type | null): string | null {
        return type ? type.name : null;
    }

}