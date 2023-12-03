// https://fabricmc.net/wiki/documentation:fabric_mod_json_spec
// https://github.com/FabricMC/fabric-loader/blob/master/src/main/java/net/fabricmc/loader/impl/metadata/V1ModMetadataParser.java

type FabricEntryPoint = string | { value: string }

export interface FabricModJson {

    id: string
    version: string
    name?: string
    entrypoints?: { [key: string]: FabricEntryPoint[] }

}
