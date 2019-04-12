/*
 * Copyright (c) 2019 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as elements from "@yellicode/elements";
import { ModelTransform } from "./model-transform";

/**
 * Transforms a Model or Package by returning just the Package that matches a specified expression.
 * @deprecated PackageFilterTransform has moved to the 'yellicode/elements' package, please update your references. 
 */
export class PackageFilterTransform<TSource extends elements.Package = elements.Model> implements ModelTransform<TSource, elements.Package> {
    private packageName: string;
    private includeNestedPackages: boolean;

    /**
     * Constructor. Creates a new PackageFilterTransform that only includes the package with the specified name.
     * @param expression The name of the package. If the name ends with a forward-slash ('/'), nested
     * packages will be included. The expression is case-insensitive.
     */
    constructor(expression: string) {
        console.warn(`PackageFilterTransform has moved to the 'yellicode/elements' package, please update your references.`);
        if (!expression) {
            throw `Unable to filter packages. The filter expression cannot be empty.`;
        }
        const normalizedExpression = expression.toLowerCase();
        if (normalizedExpression.endsWith('/')) {
            this.includeNestedPackages = true;
            this.packageName = normalizedExpression.substring(0, normalizedExpression.length - 1);
        } else {
            this.packageName = normalizedExpression;
            this.includeNestedPackages = false;
        }
    }

    /**
     * Transforms the source Model or Package and returns the first Package that matches the expression. 
     * The result will be empty if the package could not be found.
     * @param source The Model or Package to transform. 
     */
    public transform(source: elements.Model | elements.Package): elements.Package {
        if (!source || !source.packagedElements)
            return source;

        const pack = PackageFilterTransform.findPackageRecursive(source, (pack: elements.Package) => {
            return (pack.name != null) && (pack.name.toLowerCase() === this.packageName);
        });

        if (!pack)
            throw `Unable to filter packages. Could not find any nested package with name '${this.packageName}'.`;

        // Remove any nested packages if needed
        if (!this.includeNestedPackages && pack.packagedElements != null) {
            pack.packagedElements = pack.packagedElements.filter(e => !(elements.ElementTypeUtility.isPackage(e.elementType)));
        }
        return pack;
    }

    private static findPackageRecursive(root: elements.Package, predicate: (pack: elements.Package) => boolean): elements.Package | null {
        if (predicate(root)) return root;
        if (root.packagedElements == null) return null;
        // We use a for loop so that we can easily return when we 
        for (var i = 0, len = root.packagedElements.length; i < len; i++) {
            const packagedElement = root.packagedElements[i];
            if (packagedElement.elementType === elements.ElementType.package) {
                const childResult = PackageFilterTransform.findPackageRecursive(packagedElement as elements.Package, predicate);
                if (childResult != null) return childResult;
            }
        }
        return null;
    }
}
