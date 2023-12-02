import { ForgeModStructure113 } from '../structure/spec_model/module/forgemod/ForgeMod113.struct.js'
import { ForgeModStructure17 } from '../structure/spec_model/module/forgemod/ForgeMod17.struct.js'
import { ForgeGradle3Adapter } from '../resolver/forge/adapter/ForgeGradle3.resolver.js'
import { ForgeGradle2Adapter } from '../resolver/forge/adapter/ForgeGradle2.resolver.js'
import { ForgeResolver } from '../resolver/forge/Forge.resolver.js'
import { BaseForgeModStructure } from '../structure/spec_model/module/ForgeMod.struct.js'
import { MinecraftVersion } from './MinecraftVersion.js'
import { UntrackedFilesOption } from '../model/nebula/ServerMeta.js'

export class VersionSegmentedRegistry {

    public static readonly FORGE_ADAPTER_IMPL = [
        ForgeGradle2Adapter,
        ForgeGradle3Adapter
    ]

    public static readonly FORGEMOD_STRUCT_IMPL = [
        ForgeModStructure17,
        ForgeModStructure113
    ]

    public static getForgeResolver(
        minecraftVersion: MinecraftVersion,
        forgeVersion: string,
        absoluteRoot: string,
        relativeRoot: string,
        baseURL: string,
        discardOutput: boolean,
        invalidateCache: boolean
    ): ForgeResolver {
        for (const impl of VersionSegmentedRegistry.FORGE_ADAPTER_IMPL) {
            if (impl.isForVersion(minecraftVersion, forgeVersion)) {
                return new impl(absoluteRoot, relativeRoot, baseURL, minecraftVersion, forgeVersion, discardOutput, invalidateCache)
            }
        }
        throw new Error(`No forge resolver found for Minecraft ${minecraftVersion}!`)
    }

    public static getForgeModStruct(
        minecraftVersion: MinecraftVersion,
        forgeVersion: string,
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        untrackedFiles: UntrackedFilesOption[]
    ): BaseForgeModStructure<unknown> {
        for (const impl of VersionSegmentedRegistry.FORGEMOD_STRUCT_IMPL) {
            if (impl.isForVersion(minecraftVersion, forgeVersion)) {
                return new impl(absoluteRoot, relativeRoot, baseUrl, minecraftVersion, untrackedFiles)
            }
        }
        throw new Error(`No forge mod structure found for Minecraft ${minecraftVersion}!`)
    }

}
