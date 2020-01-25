import { ForgeModStructure113 } from '../model/struct/model/module/forgemod/forgemod113.struct'
import { ForgeModStructure17 } from '../model/struct/model/module/forgemod/forgemod17.struct'
import { Forge113Adapter } from '../resolver/forge/adapter/forge113.resolver'
import { Forge17Adapter } from '../resolver/forge/adapter/forge17.resolver'
import { ForgeResolver } from '../resolver/forge/forge.resolver'
import { BaseForgeModStructure } from '../model/struct/model/module/forgemod.struct'

export class VersionSegmentedRegistry {

    public static readonly FORGE_ADAPTER_IMPL = [
        Forge17Adapter,
        Forge113Adapter
    ]

    public static readonly FORGEMOD_STRUCT_IML = [
        ForgeModStructure17,
        ForgeModStructure113
    ]

    public static getForgeResolver(
        minecraftVersion: string,
        forgeVersion: string,
        absoluteRoot: string,
        relativeRoot: string,
        baseURL: string
    ): ForgeResolver {
        for (const impl of VersionSegmentedRegistry.FORGE_ADAPTER_IMPL) {
            if (impl.isForVersion(minecraftVersion)) {
                return new impl(absoluteRoot, relativeRoot, baseURL, minecraftVersion, forgeVersion)
            }
        }
        throw new Error(`No forge resolver found for Minecraft ${minecraftVersion}!`)
    }

    public static getForgeModStruct(
        minecraftVersion: string,
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string
    ): BaseForgeModStructure {
        for (const impl of VersionSegmentedRegistry.FORGEMOD_STRUCT_IML) {
            if (impl.isForVersion(minecraftVersion)) {
                return new impl(absoluteRoot, relativeRoot, baseUrl)
            }
        }
        throw new Error(`No forge mod structure found for Minecraft ${minecraftVersion}!`)
    }

}
