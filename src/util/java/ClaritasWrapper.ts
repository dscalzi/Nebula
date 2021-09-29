import { JarExecutor } from './JarExecutor'
import { join, resolve } from 'path'
import { ClaritasResult } from '../../model/claritas/ClaritasResult'
import { MinecraftVersion } from '../MinecraftVersion'
import { LibraryType } from '../../model/claritas/ClaritasLibraryType'
import { pathExists, remove, readFile, writeFile, mkdirs } from 'fs-extra'

export class ClaritasWrapper extends JarExecutor<ClaritasResult> {

    private readonly WORK_DIR: string
    private readonly ARG_FILE: string
    private readonly OUTPUT_FILE: string

    constructor(cwd: string) {
        super('Claritas')

        this.WORK_DIR = resolve(cwd, 'claritasWork')
        this.ARG_FILE = resolve(this.WORK_DIR, 'claritasArgFile.txt')
        this.OUTPUT_FILE = resolve(this.WORK_DIR, 'claritasOutput.json')

        this.onCloseListeners.push(async (code) => {
            if(code !== 0) {
                this.logger.error('Claritas finished with non-zero exit code, ', code)
                this.lastExecutionResult = undefined!
            } else {
                if(await pathExists(this.OUTPUT_FILE)) {
                    this.lastExecutionResult = JSON.parse((await readFile(this.OUTPUT_FILE)).toString('utf8'))
                } else {
                    this.logger.error('Claritas output file not found when exit code is 0, is this a bug?')
                    this.lastExecutionResult = undefined!
                }
            }
            await this.cleanOutput()
        })

    }

    protected getJarPath(): string {
        return join(process.cwd(), 'libraries', 'java', 'Claritas.jar')
    }

    private async writeArgFile(...programArgs: string[]): Promise<void> {
        await mkdirs(this.WORK_DIR)
        await writeFile(
            this.ARG_FILE,
            programArgs.join('\n')
        )
    }

    public async execute(libraryType: LibraryType, mcVersion: MinecraftVersion, absoluteJarPaths: string[]): Promise<ClaritasResult> {
        await this.writeArgFile(
            '--absoluteJarPaths', absoluteJarPaths.join(','),
            '--libraryType', libraryType,
            '--mcVersion', mcVersion.toString(),
            '--outputFile', this.OUTPUT_FILE,
            '--previewOutput', 'true'
        )
        return await super.executeJar(
            [`-Dclaritas.argFile=${this.ARG_FILE}`]
        )
    }

    private async cleanOutput(): Promise<void> {
        if(await pathExists(this.WORK_DIR)) {
            remove(this.WORK_DIR)
        }
    }

}