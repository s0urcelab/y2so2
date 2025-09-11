import fs from 'fs'

export default function postbuildManifest(urls) {
    return {
        name: 'postbuild-manifest',
        closeBundle: () => {
            const path = './dist/manifest.json'
            const manifest = JSON.parse(fs.readFileSync(path).toString())
            manifest['host_permissions'] = urls
            fs.writeFileSync(path, JSON.stringify(manifest, null, 2))
        }
    }
}