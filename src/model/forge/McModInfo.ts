// https://mcforge.readthedocs.io/en/latest/gettingstarted/structuring/#the-mcmodinfo-file
export interface McModInfo {

    modid: string
    name: string
    description: string
    version: string
    mcversion: string
    url: string
    updateUrl?: string
    updateJSON: string
    authorList: string[]
    credits: string
    logoFile: string
    screenshots: string[]
    parent: string
    useDependencyInformation: boolean
    requiredMods: string[]
    dependencies: string[]
    dependants: string[] // Spelled as dependants on forge's wiki.

}
