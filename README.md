# Nebula

Generate a distribution.json for Helios. Documentation on this format can be found [here][distro.md].

## Requirements

* Node.js 18
* Java 8+ (https://adoptopenjdk.net/)
  * This is required to run the forge installer, process [XZ](https://tukaani.org/xz/format.html) files, and run bytecode analysis on mod files.
  * Although 1.17 requires Java 16, the forge installer works with Java 8.


### Notes

* Nebula is not 100% complete. Unfinished items are listed on the [TODO list](https://github.com/dscalzi/Nebula/issues/2).
* Currently only supports creating Forge based servers. Vanilla support will be added when Helios v2 is complete.

## Setup

1. Clone the repository
2. Install the dependencies (`npm i`)
3. Create a file called [`.env`][dotenvnpm] at the root directory of the cloned folder and set the required values.

Example
```properties
JAVA_EXECUTABLE=C:\Program Files\Eclipse Foundation\jdk-17.0.0.35-hotspot\bin\java.exe
ROOT=D:\TestRoot2
BASE_URL=http://localhost:8080/
HELIOS_DATA_FOLDER=C:\Users\user\AppData\Roaming\Helios Launcher
```

## Usage

Nebula is still being developed. Usage may change, but it has remained stable for some time now.

#### TL;DR (Too Long; Didn't Read) Usage

This is the barebones overall usage. Please read the rest of this document.

* Follow the setup instructions above.
* Run the `init root` command.
* Generate servers using the `g server` command.
* Put all files in their respective folders (documented below).
* Generate the distribution using the `g distro` command.
* When in doubt, reread this document and then ask on Discord.

## Commands

Commands will be documented here. You can run any command with the `--help` option to view more information.

### Command Usage

This explains how to run the commands listed below. There are a few ways to run commands, pick your preferred method.

Example: To run `init root`, you would do `npm run start -- init root`.

*Recommended*

* Run **`npm run start -- <COMMAND>`**
  * *Why is this recommended? This command will compile the source code first.*

*Other*

* Build the project using **`npm run build`**
* Run **`node dist/index.js <COMMAND>`** OR **`npm run faststart -- <COMMAND>`**
  * `faststart` is an alias to run the main file without building.

> ***Note:***
> - ***If you modify any files, you will have to rebuild the project.***
> - ***After pulling from git, you will have to rebuild the project.***
>
> ***npm start does this automatically.***

---

### Init

Init commands are used for initializing empty file structures.

Aliases: [`init`, `i`]

__*Subcommands*__

---

#### Init Root

Generate an empty standard file structure. JSON schemas will also be generated.

`init root`

---

### Generate

Generate commands are used for generation.

Aliases: [`generate`, `g`]

__*SubCommands*__

---

#### Generate Server

Generate an new server in the root directory. Options are provided to include forge in the generated server.

`generate server <id> <version> <options>`

Options:

* `--forge <string>` Specify forge version. This is WITHOUT the minecraft version (ex. 14.23.5.2847)
  * OPTIONAL (default: null)
  * If not provided forge will not be enabled.
  * You can provide either `latest` or `recommended` to use the latest/recommended version of forge.

>
> Example Usage
>
> `generate server Test1 1.12.2 --forge 14.23.5.2847`
>

---

#### Generate Distribution

Generate a distribution file from the root file structure.

`generate distro [name]`

Arguments:
* `name` The name of the distribution file.
  * OPTIONAL (default: `distribution`)

Options:

* `--installLocal` Have the application install a copy of the generated distribution to the Helios data folder.
  * OPTIONAL (default: false)
  * This is useful to easily test the new distribution.json in dev mode on Helios.
  * Tip: Set name to `dev_distribution` when using this option.
* `--discardOutput` Delete cached output after it is no longer required. May be useful if disk space is limited.
  * OPTIONAL (default: false)
* `--invalidateCache` Invalidate and delete existing caches as they are encountered. Requires fresh cache generation.
  * OPTIONAL (default: false)

#### Notes

As of Forge 1.13, the installer must be run to generate required files. The installer output is cached by default. This is done to speed up subsequent builds and allow Nebula to be run as a CI job. Options are provided to discard installer output (no caching) and invalidate caches (delete cached output and require fresh generation). To invalidate only a single version cache, manually delete the cached folder.

>
> Example Usage
>
> `generate distro`
>
> `generate distro dev_distribution --installLocal`
>

---

#### Generate Schemas

Generate the JSON schemas used by Nebula's internal types (ex. Distro Meta and Server Meta schemas). This command should be used to update the schemas when a change to Nebula requires it. You may need to reopen your editor for the new JSON schemas to take effect.

`generate schemas`

---

### Latest Forge

Get the latest version of Forge.

`latest-forge <version>`

---

### Recommended Forge

Get the recommended version of Forge. If no recommended build is available, it will pull the latest version.

`recommended-forge <version>`

---

## File Structure Setup (Tentative)

Nebula aims to provide users with an information preserving structure for storing files. The application will use this structure to generate a full distribution.json for HeliosLauncher. For coherency, the distribution structure is modularized and encapsulated by a directory pattern. These encapsulations will be explained below. They can be generated manually or by using the commands documented above.

### Distribution Encapsulation

The distribution object is represented by the main root. All command output will be stored in this directory. The structure is documented below.

Ex.

* `TestRoot` The root directory which encapsulates the distribution.
  * `servers` All server files are stored in this directory.

### Server Encapsulation

Server objects are encapsulated in their own folders. The name of the server's folder contains both its id and version.

Ex.

* `servers`
  * `TestServer-1.12.2` A server with id TestServer set to version 1.12.2.

The server directory will contain files pertaining to that server.

Ex.

* `TestServer-1.12.2`
  * `files` All modules of type `File`.
  * `libraries` All modules of type `Library`
  * `forgemods` All modules of type `ForgeMod`.
    * This is a directory of toggleable modules. See the note below.
  * `TestServer-1.12.2.png` Server icon file.

#### Toggleable Modules

If a directory represents a toggleable mod, it will have three subdirectories. You must filter your files into these three.

* `required` Modules that are required.
* `optionalon` Modules that are optional and enabled by default.
* `optionaloff` Modules that are optional and disabled by default.

### Additional Metadata

To preserve metadata that cannot be inferred via file structure, two files exist. Default values will be generated when applicable. Customize to fit your needs. These values should be self explanatory. If further details are required, see the [distribution.json specification document][distro.md].

#### ${ROOT}/meta/distrometa.json

Represents the additiona metadata on the distribution object.

A JSON schema is provided to assist editing this file. It should automatically be referenced when the default file is generated.

Sample:

```json
{
  "$schema": "file:///${ROOT}/schemas/DistroMetaSchema.schema.json",
  "meta": {
      "rss": "<LINK TO RSS FEED>",
      "discord": {
          "clientId": "<FILL IN OR REMOVE DISCORD OBJECT>",
          "smallImageText": "<FILL IN OR REMOVE DISCORD OBJECT>",
          "smallImageKey": "<FILL IN OR REMOVE DISCORD OBJECT>"
      }
  }
}
```

#### servers/${YOUR_SERVER}/servermeta.json

Represents the additional metadata on the server object (for a YOUR_SERVER).

A JSON schema is provided to assist editing this file. It should automatically be referenced when the default file is generated.

Sample:

```json
{
  "$schema": "file:///${ROOT}/schemas/ServerMetaSchema.schema.json",
  "meta": {
    "version": "1.0.0",
    "name": "Test (Minecraft 1.12.2)",
    "description": "Test Running Minecraft 1.12.2 (Forge v14.23.5.2854)",
    "address": "localhost:25565",
    "discord": {
      "shortId": "1.12.2 Test Server",
      "largeImageText": "1.12.2 Test Server",
      "largeImageKey": "seal-circle"
    },
    "mainServer": false,
    "autoconnect": true
  },
  "forge": {
    "version": "14.23.5.2854"
  },
  "untrackedFiles": []
}
```

#### Untracked Files

Untracked files is optional. MD5 hashes will not be generated for files matching the provided glob patterns. The launcher will not validate/update files without MD5 hashes.

```json
{
  "untrackedFiles": [
    {
      "appliesTo": ["files"],
      "patterns": [
        "config/*.cfg",
        "config/**/*.yml"
      ]
    }
  ]
}
```

In the above example, all files of type `cfg` in the config directory will be untracked. Additionally, all files of type `yml` in the config directory and its subdirectories will be untracked. You can tweak these patterns to fit your needs, this is purely an example. The patterns will only be applied to the folders specified in `appliesTo`. As an example, valid values include `files`, `forgemods`, `libraries`, etc.

```json
{
  "untrackedFiles": [
    {
      "appliesTo": ["files"],
      "patterns": [
        "config/*.cfg",
        "config/**/*.yml"
      ]
    },
    {
      "appliesTo": ["forgemods"],
      "patterns": [
        "optionalon/*.jar"
      ]
    }
  ]
}
```

Another example where all `optionalon` forgemods are untracked. **Untracking mods is NOT recommended. This is an example ONLY.**

### Note on JSON Schemas

The `$schema` property in a JSON file is a URL to a JSON schema file. This property is optional. Nebula provides schemas for internal types to make editing the JSON easier. Editors, such as Visual Studio Code, will use this schema file to validate the data and show useful information, like property descriptions. Valid properties will also be autocompleted. For detailed information, you may view the [JSON Schema Website](jsonschemawebsite).

Nebula will store JSON schemas in `${ROOT}/schemas`. This is so that they will always be in sync with your local version of Nebula. They will initially be generated by the `init root` command. To update the schemas, you can run the `generate schemas` command.


[dotenvnpm]: https://www.npmjs.com/package/dotenv
[distro.md]: https://github.com/dscalzi/HeliosLauncher/blob/master/docs/distro.md
[jsonschemawebsite]: https://json-schema.org/