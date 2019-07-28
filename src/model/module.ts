import { Artifact } from './artifact'
import { Required } from './required'

export interface Module {

    /**
     * The ID of the module. All modules that are not of type File MUST use a maven identifier.
     *  Version information and other metadata is pulled from the identifier. Modules which are
     * stored maven style use the identifier to resolve the destination path. If the extension
     * is not provided, it defaults to jar.
     *
     * Template
     *
     * my.group:arifact:version@extension
     *
     * my/group/artifact/version/artifact-version.extension
     *
     * If the module's artifact does not declare the path property, its path will be resolved from the ID.
     */
    id: string

    /**
     * The name of the module. Used on the UI.
     */
    name: string

    /**
     * The type of the module.
     */
    type: string

    /**
     * Defines whether or not the module is required. If omitted, then the module will be required.
     */
    required?: Required

    /**
     * The download artifact for the module.
     */
    artifact: Artifact

    /**
     * An array of sub modules declared by this module. Typically, files which require other files
     * are declared as submodules. A quick example would be a mod, and the configuration file for
     * that mod. Submodules can also declare submodules of their own. The file is parsed recursively,
     * so there is no limit.
     */
    subModules?: Module[]

}
