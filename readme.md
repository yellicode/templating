# Yellicode Templating

## Templating package for Yellicode

Yellicode lets you build your own code generation templates with TypeScript. It consists of a Node.js CLI and extensible APIs, making it easy for developers to create, share and re-use code generators for their favorite programming languages and frameworks. 

Check out [our website](https://www.yellicode.com) for more.

License: MPL-2.0

## Using the Templating package
This package contains the basic templating infrastructure, as well as utilities and base classes for creating custom code writers and model transforms for Yellicode.

In order to run a code generation template, you must have the CLI installed (@yellicode/cli) and have a valid *codegenconfig.json* file. Please refer to the [installation instructions](https://www.yellicode.com/docs/installation) and the [quick start](https://www.yellicode.com/docs/quickstart) for more.

### Very basic usage - without code model

```ts
import { Generator, TextWriter } from '@yellicode/templating';

Generator.generate({outputFile: './my-file.txt'}, (writer: TextWriter) => {
    writer.writeLine('File generated at '+new Date().toISOString());
}); 
```

### Basic usage - with code model
When generating code from a code model, you should at least install the Model package (@yellicode/model). The template structure should be as follows:

```ts
import { Generator, TextWriter } from '@yellicode/templating';
import * as model from '@yellicode/model';

Generator.generateFromModel({outputFile: './my-file.txt'}, (writer: TextWriter, model: model.Package) => {
    // Enumerate classes
    model.getAllClasses().forEach((c) => {
        // Write a class definition here...
        // Enumerate attributes
        c.ownedAttributes.forEach(att => {
            // Write the attribute definition here...
        });                
    })
});     
```

### Generating multiple files with a single template
```ts
import { Generator, TextWriter } from '@yellicode/templating';
import * as model from '@yellicode/model';

Generator.getModel().then((model: model.Model) => {
    // Generate a file for each class in the model  
    model.getAllClasses().forEach((c) => {
        Generator.generate({ outputFile: `${c.name}.txt` }, (writer: TextWriter) => {
            writer.writeLine(`/* This file contains the code for class '${c.name}'. */`);
        });
    });
})
```

## API documentation
The detailed Templating API documentation can be found [here](https://www.yellicode.com/docs/api/templating).