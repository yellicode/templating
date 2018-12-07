/*
 * Copyright (c) 2018 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as elements from "@yellicode/elements";

/**
 * Defines the interface for classes that determine type names for types in a model. This interface
 * is typically implemented by language-specific code generators, which may need to convert the 
 * name of a model type to the name used by the programming lanugage. 
 * For example: a decimal, float or integer in a model should result in a type named 'number' when 
 * generating TypeScript code. 
 * This interface is implemented by the DefaultTypeNameProvider, which can be extended to provide 
 * language-specific type names.
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
 * returns type names as-is, but allows inheritors to provide their own implementation
 * by overriding getTypeNameForType and/or getTypeNameForTypedElement.
 */
export class DefaultTypeNameProvider implements TypeNameProvider {
    /**
     * Returns the name of the provided type.
     * @param type Any model type.
     */
    public getTypeName(type: elements.Type | null): string | null;
    /**
     * Returns the name of the provided element's type.
     * @param typedElement Any model element that has a type.
     */
    public getTypeName(typedElement: elements.TypedElement | null): string | null;
    public getTypeName(typeOrTypedElement: elements.Type | elements.TypedElement | null): string | null {
        if (elements.isTypedElement(typeOrTypedElement)) {
            // The argument is a typedElement            
            const isMultiValued = elements.isMultiplicityElement(typeOrTypedElement) && typeOrTypedElement.isMultivalued();
            return this.getTypeNameForTypedElement(typeOrTypedElement, elements.isDataType(typeOrTypedElement.type), isMultiValued);
        }
        else {
            // The argument is a type
            return this.getTypeNameForType(typeOrTypedElement, elements.isDataType(typeOrTypedElement));
        }
    }

     /**
     * Returns the name of the provided type. This function is also called by getTypeNameOfTypedElement() if that function is not overridden.
     * @param type The type information.
     * @param isDataType Indicates if the type is a data type (that is, an Enumeration, PrimitiveType or DataType).
     */
    protected /* virtual */ getTypeNameForType(type: elements.Type | null, isDataType: boolean): string | null {
        // Note: we don't use isDataType in this default implementation, but it is considered relevant for implementers.
        return type ? type.name : null;
    }

     /**
     * Returns the name of the provided element's type. Internally, this function calls getTypeNameForType for the type, but
     * you should override this function if you need to provide different type names for a type depending on the context. 
     * For example, you may return a different type name for a property or parameter that is multi-valued.
     * @param typedElement Any element that has a type.
     * @param isDataType Indicates if the element's type is a data type (that is, an Enumeration, PrimitiveType or DataType).
     * @param isMultiValued Indicates if the TypedElement is multi-valued (that is, has an upper bound greater than 1).
     */
    protected /* virtual */ getTypeNameForTypedElement(typedElement: elements.TypedElement, isDataType: boolean, isMultiValued: boolean): string | null {
        // Note: we don't use isMultiValued in this default implementation, but it is considered relevant for implementers.
        return this.getTypeNameForType(typedElement.type, isDataType);
    }    

    /**
     * DEPRECATED: Returns the name of the provided element's data type. Override this function to map primitives and other data types 
     * (both built-in or types exported from a profile) to the target language. The default implementation calls the 
     * getDataTypeNameForType function using the type of the typedElement.
     * @param typedElement Any TypedElement instance.
     * @deprecated Please override getTypeNameForTypedElement instead.
     */
    protected /*virtual*/ getDataTypeName(typedElement: elements.TypedElement): string | null {
        console.warn(`DefaultTypeNameProvider.getDataTypeName is deprecated. Please override getTypeNameForTypedElement instead.`);
        const isMultiValued = elements.isMultiplicityElement(typedElement) && typedElement.isMultivalued();
        return this.getTypeNameForTypedElement(typedElement, true, isMultiValued);
    }

     /**
     * DEPRECATED: Returns the name of the provided data type. Override this function to map primitives and other data types 
     * (both built-in or types exported from a profile) to the target language.
     * @param type The type information.
     * @deprecated Please override getTypeNameForType instead.
     */
    protected /*virtual*/ getDataTypeNameForType(type: elements.Type | null): string | null {
        console.warn(`DefaultTypeNameProvider.getDataTypeNameForType is deprecated. Please override getTypeNameForType instead.`);      
        return this.getTypeNameForType(type, true);
    }

    /**
     * DEPRECATED: Returns the name of the provided element's complex type (any type that is not a DataType). Override this function to provide
     * a custom name for the complex type. The default implementation calls the getComplexTypeNameForType function using 
     * the type of the typedElement.
     * @param typedElement Any TypedElement instance.
     * @deprecated Please override getTypeNameForTypedElement instead.
     */
    protected /*virtual*/ getComplexTypeName(typedElement: elements.TypedElement): string | null {
        console.warn(`DefaultTypeNameProvider.getComplexTypeName is deprecated. Please override getTypeNameForTypedElement instead.`);
        const isMultiValued = elements.isMultiplicityElement(typedElement) && typedElement.isMultivalued();
        return this.getTypeNameForTypedElement(typedElement, false, isMultiValued);
    }

     /**
     * DEPRECATED: Returns the name of the provided complex type (any type that is not a DataType). Override this function to provide
     * a custom name for the complex type.
     * @param type The type information.
     * @deprecated Please override getTypeNameForType instead.
     */
    protected /*virtual*/ getComplexTypeNameForType(type: elements.Type | null): string | null {
        console.warn(`DefaultTypeNameProvider.getComplexTypeNameForType is deprecated. Please override getTypeNameForType instead.`);      
        return this.getTypeNameForType(type, false);
    }

}