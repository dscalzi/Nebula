# Nebula

Generate a distribution.json for Helios.

## Requirements

* Node.js 12
* Java 8+ (https://adoptopenjdk.net/)
  * This is required to process [XZ](https://tukaani.org/xz/format.html) files.

## Setup

1. Clone the repository
2. Install the dependencies (`npm i`)
3. Create a `.env` file at the root directory of the cloned folder and set the required values.

Example .env :
```properties
JAVA_EXECUTABLE=C:\Program Files\AdoptOpenJDK\jdk-8.0.232.09-hotspot\bin\java.exe
ROOT=D:\TestRoot2
BASE_URL=http://localhost:8080/
```

4. Build

```bash
npm run build
```

## Usage

Nebula is not complete. The following usage is tentative.

#### Notes

Rather than updating the entire usage with minor changes, please read these notes.

* Root and BaseUrl options are currently disabled. This information is being pulled from the `.env` for now.

## Commands

Commands will be documented here. You can run any command with the `--help` option to view more information.

### Init

Init commands are used for initializing empty file structures.

Aliases: [`init`, `i`]

__*Subcommands*__

---

#### Init Root

Generate an empty standard file structure.

`init root <options>`

Options:

* `--root <string>` Specify the root directory.

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

* `--root <string>` Specify the root directory.
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
> `node dist/index.js generate server Test1 1.12.2 --root C:/TestRoot --forge 14.23.5.2847`
>

---

#### Generate Distribution

Generate a distribution file from the root file structure.

`generate distro [name] <options>`

Arguments:
* `name` The name of the distribution file.
  * OPTIONAL (default: `distribution`)

Options:

* `--root <string>` Specify the root directory.
* `--baseUrl <string>` Base url of your file host.

>
> Example Usage
>
> `node dist/index.js generate distribution --root C:/TestRoot --baseUrl https://myhost.com`
>

---

### Latest Forge

Get the latest version of Forge.

`node dist/index.js latest-forge <version>`

---

### Recommended Forge

Get the recommended version of Forge. If no recommended build is available, it will pull the latest version.

`node dist/index.js recommended-forge <version>`

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
  * `forgemods` All modules of type `ForgeMod`.
  * `litemods` All modules of type `LiteMod`.
  * `TestServer-1.12.2.png` Server icon file.