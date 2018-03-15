/*
 * Copyright (c) 2018 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as model from "@yellicode/model";
import { ModelTransform } from "./model-transform";

/**
 * A base class for transforms that need to be applied recursively to all nested packaged elements 
 * in a model or package.
 */
export abstract class PackagedElementTransform<TSource extends model.Package = model.Model> implements ModelTransform<TSource, model.Package> {
    /**
     * Transforms the package and returns the transformation result.
     * @param pack The package or model to transform.
     */
    public transform(pack: TSource): model.Package {
        if (pack == null)
            return pack;

        this.transformElement(pack);
        this.transformPackageRecursive(pack);
        return pack;
    }

    /**
     * When implemented, applies the transformation to the packageable element, 
     * @param element 
     */
    protected abstract transformElement(element: model.PackageableElement): void;

    private transformPackageRecursive(pack: model.Package) {
        if (pack.packagedElements == null)
            return;

        pack.packagedElements.forEach((element: model.PackageableElement) => {
            this.transformElement(element);
            if (model.ElementTypeUtility.isPackage(element.elementType)) {
                this.transformPackageRecursive(<model.Package>element);
            }
        })
    }
}