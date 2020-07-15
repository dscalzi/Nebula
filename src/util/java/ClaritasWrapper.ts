import { JarExecutor } from './JarExecutor'
import { join } from 'path'
import { ClaritasResult } from '../../model/claritas/ClaritasResult'
import { MinecraftVersion } from '../MinecraftVersion'
import { LibraryType } from '../../model/claritas/ClaritasLibraryType'

export class ClaritasWrapper extends JarExecutor<ClaritasResult> {

    constructor() {
        super('Claritas')
        this.stdoutListeners.push((data) => {
            const clean = data.toString('utf8').trim() as string
            const spike = 'results::'
            if(clean.startsWith(spike)) {
                this.lastExecutionResult = JSON.parse(clean.substr(spike.length)) as ClaritasResult
            }
        })
    }

    protected getJarPath(): string {
        return join(process.cwd(), 'libraries', 'java', 'Claritas.jar')
    }

    public execute(libraryType: LibraryType, mcVersion: MinecraftVersion, absoluteJarPaths: string[]): Promise<ClaritasResult> {
        return super.executeJar(
            '--absoluteJarPaths', absoluteJarPaths.join(','),
            '--libraryType', libraryType,
            '--mcVersion', mcVersion.toString()
        )
    }

}