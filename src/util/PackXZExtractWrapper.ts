import { spawn } from 'child_process'
import { join } from 'path'

export class PackXZExtractWrapper {

    public static getJavaExecutable() {
        return process.env.JAVA_EXECUTABLE as string
    }

    public static getPackXZExtract() {
        return join(process.cwd(), 'libraries', 'java', 'PackXZExtract.jar')
    }

    public static extractUnpack(paths: string[]) {
        return PackXZExtractWrapper.execute('-packxz', paths)
    }

    public static extract(paths: string[]) {
        return PackXZExtractWrapper.execute('-xz', paths)
    }

    public static unpack(paths: string[]) {
        return PackXZExtractWrapper.execute('-pack', paths)
    }

    private static execute(command: string, paths: string[]) {
        return new Promise((resolve, reject) => {
            const child = spawn(PackXZExtractWrapper.getJavaExecutable(), [
                '-jar',
                PackXZExtractWrapper.getPackXZExtract(),
                command,
                paths.join(',')
            ])
            child.stdout.on('data', (data) => console.log('[PackXZExtract]', data.toString('utf8')))
            child.stderr.on('data', (data) => console.error('[PackXZExtract]', data.toString('utf8')))
            child.on('close', (code, signal) => {
                console.log('[PackXZExtract]', 'Exited with code', code)
                resolve()
            })
        })
    }

}
