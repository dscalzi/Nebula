# Nebula

Generate a distribution.json for Helios. Documentation on this format can be found [here][distro.md].

## Requirements

* Node.js 12
* Java 8+ (https://adoptopenjdk.net/)
  * This is required to run the forge installer and process [XZ](https://tukaani.org/xz/format.html) files.


### Notes

* Nebula is not 100% complete. Unfinished items are listed on the [TODO list](https://github.com/dscalzi/Nebula/issues/2).
* Currently only supports creating Forge based servers. Vanilla support will be added when Helios v2 is complete.

## Setup

1. Clone the repository
2. Install the dependencies (`npm i`)
3. Create a file called [`.env`][dotenvnpm] at the root directory of the cloned folder and set the required values.

Example
```properties
JAVA_EXECUTABLE=C:\Program Files\AdoptOpenJDK\jdk-8.0.232.09-hotspot\bin\java.exe
ROOT=D:\TestRoot2
BASE_URL=http://localhost:8080/
HELIOS_DATA_FOLDER=C:\Users\user\AppData\Roaming\Helios Launcher
```

## Usage

Nebula is not complete. The following usage is tentative.

#### TL;DR Usage

* Follow the setup instructions above.
* Run the `init root` command.
* Generate servers using the `g server` command.
* Put all files in their respective folders (documented below).
* Generate the distribution using the `g distro` command.
* When in doubt, reread this document and then ask on Discord.

## Commands

Commands will be documented here. You can run any command with the `--help` option to view more information.

#### Command Usage

*Recommended*

* Run `npm run start -- <COMMAND>`

*Other*

* Build the project using `npm run build`
* Run `node dist/index.js <COMMAND>`

*Note: If you modify any files, you will have to rebuild the project. npm start does this automatically.*

---

### Init

Init commands are used for initializing empty file structures.

Aliases: [`init`, `i`]

__*Subcommands*__

---

#### Init Root

Generate an empty standard file structure.

`init root`

---

### Generate

Generate commands are used for generation.

Aliases: [`generate`, `g`]

__*SubCommands*__

---

#### Generate Server

Generate an new server in the root directory. Options are provided to include forge/liteloader in the generated server.

`generate server <id> <version> <options>`

Options:

* `--forge <string>` Specify forge version. This is WITHOUT the minecraft version (ex. 14.23.5.2847)
  * OPTIONAL (default: null)
  * If not provided forge will not be enabled.
  * You can provide either `latest` or `recommended` to use the latest/recommended version of forge.
* `--liteloader <string>` Specify liteloader version.
  * OPTIONAL (default: null)
  * If not provided liteloader will not be enabled.

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

>
> Example Usage
>
> `generate distro`
>
> `generate distro dev_distribution --installLocal`
>

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
  * `litemods` All modules of type `LiteMod`.
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

Represents the additiona metadata on the distribution object. Sample:

```json
{
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

Represents the additional metadata on the server object (for a YOUR_SERVER). Sample:

```json
{
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

Untracked files is optional. MD5 hashes will not be generated for files matching the provided glob patterns.

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
      "appliesTo": ["forgemods", "litemods"],
      "patterns": [
        "optionalon/*.jar"
      ]
    }
  ]
}
```

Another example where all `optionalon` forgemods and litemods are untracked. **Untracking mods is NOT recommended. This is an example ONLY.**


[dotenvnpm]: https://www.npmjs.com/package/dotenv
[distro.md]: https://github.com/dscalzi/HeliosLauncher/blob/master/docs/distro.md