# Modrinth Integration for Nebula

I've added Modrinth integration features to my fork of Nebula. These features allow you to leverage Modrinth's content delivery network (CDN) and modpack format to simplify server creation and distribution.

## Overview

My fork adds two powerful Modrinth integration features:

1. **Server Creation from Modrinth Modpacks**: Generate server configurations directly from `.mrpack` files
2. **Distribution Generation with Modrinth CDN Links**: Create distribution files that use Modrinth's CDN links instead of hosting the files yourself

## Requirements

* All [standard Nebula requirements][readme] apply
* Node.js 20
* Java 8+ (https://adoptium.net/)
* For modpack integration, you'll need valid `.mrpack` files downloaded from [Modrinth][modrinth]

## Setup

1. Clone this fork of the repository
2. Install the dependencies (`npm i`)
3. Create a file called [`.env`][dotenvnpm] at the root directory of the cloned folder and set the required values.

Example `.env` file:
```properties
JAVA_EXECUTABLE=C:\Program Files\Eclipse Adoptium\jdk-17.0.12.7-hotspot\bin\java.exe
ROOT=D:\TestRoot2
BASE_URL=http://localhost:8080/
HELIOS_DATA_FOLDER=C:\Users\user\AppData\Roaming\Helios Launcher
```

## Server Creation from Modrinth Modpacks

### Setup

1. Create a directory at `${ROOT}/modpacks/modrinth/`
2. Place your `.mrpack` file in this directory

### Usage

```bash
npm run start -- generate server-modrinth <id> <mrpackName>
```

Example:
```bash
npm run start -- generate server-modrinth WynnCraft-Prod world-of-wynncraft.mrpack
```

### How It Works

1. The command extracts the `.mrpack` file and reads the `modrinth.index.json` inside
2. It creates a new server structure with the specified ID and Minecraft version from the modpack
3. Mods are categorized based on their environment settings:
   - Required mods go to `required/`
   - Optional mods (enabled by default) go to `optionalon/`
   - Optional mods (disabled by default) go to `optionaloff/`
4. All override files from the modpack are extracted to the appropriate directories:
   - `overrides/` contents go to the server's `files/` directory
   - `client-overrides/` contents go to client-specific locations
   - `server-overrides/` contents go to server-specific locations
5. The original `modrinth.index.json` file is saved in the server directory for reference

### Benefits

- Eliminates manual download and organization of mods
- Ensures correct mod loader configuration (Forge/Fabric)
- Preserves all modpack settings and configurations
- Simplifies setup of complex modpacks

## Distribution Generation with Modrinth CDN

### Setup

1. Make sure you have created server configurations using standard Nebula methods or the modpack integration above
2. Each server directory that should use Modrinth CDN links must contain a valid `modrinth.index.json` file
   - This file is automatically included when using `generate server-modrinth`
   - For manually created servers, you can copy this file from a downloaded modpack

### Usage

```bash
npm run start -- generate modrinth-distro [name]
```

Options:
* `--installLocal` Install the generated distribution to your Helios data folder
* `--discardOutput` Delete cached output after it is no longer required
* `--invalidateCache` Invalidate and delete existing caches as they are encountered

### How It Works

1. The command analyzes all server directories in your root structure
2. For each server with a `modrinth.index.json` file:
   - It maps file paths to their corresponding Modrinth CDN links
   - It generates MD5 hashes for all tracked files (even those using Modrinth CDN)
   - For any file not found in the Modrinth index, it falls back to your hosted URL
3. The final distribution.json contains a mix of your hosted URLs and Modrinth CDN links

### Benefits

- Dramatically reduces your bandwidth and storage requirements
- Improves download speeds for users (Modrinth's CDN is globally distributed)
- Still allows custom content not available on Modrinth
- Maintains full compatibility with the [Helios Launcher][helios]
- Preserves MD5 hash verification for security

## Deployment Recommendations

### Minimizing Storage Requirements

Once you've generated your distribution with Modrinth CDN links, you can significantly reduce your storage footprint:

1. **Delete Mod Files**: After generating MD5 hashes, you can safely delete the mod files in:
   - `forgemods/` directories
   - `fabricmods/` directories
   
   The distribution.json will reference Modrinth's CDN for these files, not your hosting.

2. **Keep Only Overrides**: You only need to retain:
   - The `files/` directory (containing configs and other overrides)
   - Your `modrinth.index.json` files
   - Your `servermeta.json` files

3. **Host on GitHub Pages**: You can host your final distribution for free:
   - Push the cleaned directory structure to a GitHub repository
   - Enable GitHub Pages in your repository settings
   - Set your `BASE_URL` to the GitHub Pages URL when generating the distribution
   - Commit and push only the `distribution.json` and minimal required files

This approach allows you to distribute modpacks of any size while minimizing your hosting costs. Modrinth's CDN handles all the heavy lifting of distributing mods, while you only need to host a small amount of custom configuration files.

## Technical Details

### Modrinth Index Format

The `modrinth.index.json` file contains information about all files in a modpack:

```json
{
  "game": "minecraft",
  "formatVersion": 1,
  "versionId": "1.0.0",
  "name": "Example Modpack",
  "files": [
    {
      "path": "mods/example.jar",
      "hashes": {
        "sha1": "hash-value",
        "sha512": "hash-value"
      },
      "env": {
        "client": "required",
        "server": "required"
      },
      "downloads": [
        "https://cdn.modrinth.com/data/..."
      ],
      "fileSize": 123456
    }
  ],
  "dependencies": {
    "minecraft": "1.21.4",
    "fabric-loader": "0.16.12"
  }
}
```

### Implementation Notes

- The implementation automatically handles files with normalized paths
- It respects environment settings (client/server required/optional)
- It preserves MD5 hash verification even when using Modrinth CDN links
- Files not tracked by Modrinth still use your hosted URLs
- Untracked files (as specified in `servermeta.json`) remain untracked


## Reference

- [Nebula Documentation][readme]
- [Helios Launcher][helios]
- [Modrinth][modrinth]
- [Distribution Format Specification][distro.md]

[readme]: https://github.com/dscalzi/Nebula#readme
[helios]: https://github.com/dscalzi/HeliosLauncher
[modrinth]: https://modrinth.com
[distro.md]: https://github.com/dscalzi/HeliosLauncher/blob/master/docs/distro.md
[dotenvnpm]: https://www.npmjs.com/package/dotenv
