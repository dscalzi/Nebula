import { spawn } from 'child_process'
import { join } from 'path'
import { JavaUtil } from './javautil'

export class PackXZExtractWrapper {

    public static getPackXZExtract(): string {
        return join(process.cwd(), 'libraries', 'java', 'PackXZExtract.jar')
    }

    public static extractUnpack(paths: string[]): Promise<void> {
        return PackXZExtractWrapper.execute('-packxz', paths)
    }

    public static extract(paths: string[]): Promise<void> {
        return PackXZExtractWrapper.execute('-xz', paths)
    }

    public static unpack(paths: string[]): Promise<void> {
        return PackXZExtractWrapper.execute('-pack', paths)
    }

    private static execute(command: string, paths: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = spawn(JavaUtil.getJavaExecutable(), [
                '-jar',
                PackXZExtractWrapper.getPackXZExtract(),
                command,
                paths.join(',')
            ])
            child.stdout.on('data', (data) => console.log('[PackXZExtract]', data.toString('utf8').trim()))
            child.stderr.on('data', (data) => console.error('[PackXZExtract]', data.toString('utf8').trim()))
            child.on('close', code => {
                console.log('[PackXZExtract]', 'Exited with code', code)
                resolve()
            })
            child.on('error', (err) => {
                console.log('[PackXZExtract]', 'Error during process execution', err)
                reject(err)
            })
        })
    }

}
