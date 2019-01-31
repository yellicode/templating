/*
 * Copyright (c) 2019 Yellicode
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as elements from "@yellicode/elements";
import { PackagedElementTransform } from "./packaged-element-transform";
import { NameUtility } from "../name-utility";

// Note: using plural words here to avoid using reserved keywords.

/**
 * Enumerates which element types to be renamed when performing rename transforms.
 */
export enum RenameTargets {
    /**
     * No elements are renamed.
     */
    none = 0,
    /**
     * Classes are renamed.
     */
    classes = 1 << 0,
    /**
     * Interfaces are renamed.
     */
    interfaces = 1 << 1,
    /**
     * Properties are renamed.
     */
    properties = 1 << 2,
    /**
     * Operations are renamed.
     */
    operations = 1 << 3,
    /**
     * Operation parameters are renamed.
     */
    parameters = 1 << 4,
    /**
     * Enumerations are renamed.
     */
    enumerations = 1 << 5,
    /**
     * Enumeration literals are renamed.
     */
    enumerationLiterals = 1 << 6,
    /**
     * All members are renamed: properties, operations, parameters and enumerationLiterals.
     */
    allMembers = properties | operations | parameters | enumerationLiterals,
    /**
     * All elements are renamed.
     */
    all = classes | interfaces | enumerations | properties | operations | parameters | enumerationLiterals
}

/**
 * A base class for renaming classes, interfaces, properties, operations parameters, enumerations and enumeration literals.
 */
export abstract class RenamingTransform extends PackagedElementTransform {
    private targets: RenameTargets;

    /**
     * Constructor. Creates a new RenamingTransform with the specified targets.
     * @param targets Optional: indicates which elements to rename. The default is RenameTargets.all.
     */
    constructor(targets?: RenameTargets) {
        super();
        this.targets = targets == null ? RenameTargets.all : targets;
    }

    private hasTarget(target: RenameTargets): boolean {
        if (this.targets & target) return true;
        else return false;
    }

    protected transformElement(element: elements.PackageableElement) {
        if (!elements.ElementTypeUtility.isMemberedClassifier(element.elementType))
            return;

        if (this.hasTarget(RenameTargets.classes) && elements.ElementTypeUtility.isClass(element.elementType)) {
            element.name = this.rename(element.name, element);
        }

        if (this.hasTarget(RenameTargets.interfaces) && elements.ElementTypeUtility.isInterface(element.elementType)) {
            element.name = this.rename(element.name, element);
        }

        // The element has OwnedAttributes and OwnedOperations
        var classifier = element as elements.MemberedClassifier;
        if (classifier.ownedAttributes != null && this.hasTarget(RenameTargets.properties)) {
            classifier.ownedAttributes.forEach(att => {
                att.name = this.rename(att.name, att);
            });
        }

        if (classifier.ownedOperations != null) {
            classifier.ownedOperations.forEach(op => {
                if (this.hasTarget(RenameTargets.operations)) {
                    op.name = this.rename(op.name, op);
                }
                if (this.hasTarget(RenameTargets.parameters)) {
                    op.ownedParameters.forEach(p => {
                        p.name = this.rename(p.name, p);
                    });
                }
            });
        }

        if (elements.ElementTypeUtility.isEnumeration(element.elementType)) {
            var enumeration = <elements.Enumeration>element;
            if (this.hasTarget(RenameTargets.enumerations)) {
                enumeration.name = this.rename(enumeration.name, enumeration);
            }
            if (enumeration.ownedLiterals != null && this.hasTarget(RenameTargets.enumerationLiterals)) {
                enumeration.ownedLiterals.forEach(literal => {
                    literal.name = this.rename(literal.name, literal);
                })
            }
        }
    }

    protected abstract rename(name: string, target: elements.Element): string;
}

/**
 * A transform that capitalizes its rename targets, that is, makes the
 * first character uppercase.
 */
export class CapitalizingTransform extends RenamingTransform {
    /**
     * Constructor. Creates a new CapitalizingTransform with the specified targets. 
     * @param targets Optional: indicates which elements to rename. The default is RenameTargets.all.
     */
    constructor(targets?: RenameTargets) {
        super(targets);
    }

    protected rename(name: string, target: elements.Element): string {
        return NameUtility.capitalize(name);
    }
}

/**
 * A transform that uncapitalizes its rename targets, that is, makes the
 * first character lowercase.
 */
export class UnCapitalizingTransform extends RenamingTransform {
    /**
     * Constructor. Creates a new UnCapitalizingTransform with the specified targets. 
     * @param targets Optional: indicates which elements to rename. The default is RenameTargets.all.
     */
    constructor(targets?: RenameTargets) {
        super(targets);
    }

    protected rename(name: string, target: elements.Element): string {
        return NameUtility.unCapitalize(name);
    }
}

/**
 * A transform that converts its rename targets from UpperCamelCase to lowerCamelCase.
 */
export class UpperToLowerCamelCaseTransform extends RenamingTransform {
    /**
       * Constructor. Creates a new UpperToLowerCamelCaseTransform with the specified targets. 
       * @param targets Optional: indicates which elements to rename. The default is RenameTargets.all.
       */
    constructor(targets?: RenameTargets) {
        super(targets);
    }

    protected rename(name: string, target: elements.Element): string {
        return NameUtility.upperToLowerCamelCase(name);
    }
}

/**
 * A transform that converts its rename targets from lowerCamelCase to UpperCamelCase.
 */
export class LowerToUpperCamelCaseTransform extends RenamingTransform {
    /**
       * Constructor. Creates a new LowerToUpperCamelCaseTransform with the specified targets. 
       * @param targets Optional: indicates which elements to rename. The default is RenameTargets.all.
       */
    constructor(targets?: RenameTargets) {
        super(targets);
    }

    protected rename(name: string, target: elements.Element): string {
        return NameUtility.lowerToUpperCamelCase(name);
    }
}

/**
 * A transform that adds a prefix to its rename targets.
 */
export class PrefixingTransform extends RenamingTransform {
    private prefix: string;

    /**
    * Constructor. Creates a new PrefixingTransform with the specified targets. 
    * @param targets Optional: indicates which elements to rename. The default is RenameTargets.all.
    */
    constructor(targets: RenameTargets, prefix: string) {
        super(targets);
        this.prefix = prefix;
    }

    protected rename(name: string, target: elements.Element): string {
        return this.prefix + name;
    }
}

/**
 * A transform that adds a suffix to its rename targets.
 */
export class SuffixingTransform extends RenamingTransform {
    private suffix: string;

    /**
    * Constructor. Creates a new SuffixingTransform with the specified targets. 
    * @param targets Optional: indicates which elements to rename. The default is RenameTargets.all.
    */
    constructor(targets: RenameTargets, suffix: string) {
        super(targets);
        this.suffix = suffix;
    }

    protected rename(name: string, target: elements.Element): string {
        return name + this.suffix;
    }
}