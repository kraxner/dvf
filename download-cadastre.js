require('dotenv').config()
const {join} = require('path')
const https = require('https')
var fs = require('fs-extra');
const {getCodeDepartement} = require('./lib/recog')

const arrondissementsMunicipaux = require('@etalab/decoupage-administratif/data/communes.json')
  .map(c => c.code)

// specify the following settings in the file .env:
const outputPath = process.env.CADASTRE_COMMUNES_PATH
const dateCadastre = process.env.DATE_ALIGNEMENT_CADASTRE


async function main () {
	if (!await fs.pathExists(outputPath)) {
		return Promise.reject('Outputpath does not exist: ' +  outputPath)
	}
	const communes = arrondissementsMunicipaux//.filter((code, idx) => idx < 2)

	// force downloading files one by one
	for (var i = 0; i < communes.length; i++) {
		try {
			await downloadCommuneData(communes[i])
		} catch (e) {
			console.error(e)
		}
	}
	return Promise.resolve('finished')
}

async function downloadCommuneData( code ) {
	const codeDepartement = getCodeDepartement(code)
	
	const communeDir = join(outputPath, codeDepartement, code)
	const fileName = `cadastre-${code}-parcelles.json.gz`
    const filePath = join(communeDir, fileName)

    const hasFile = await fs.pathExists(filePath)
    
    try {
	    if (!hasFile) {
	    	await fs.ensureDir(communeDir)
	    }
    } catch (err) {
    	return Promise.reject(err)
    }
    if (!hasFile) {
    	return downloadToFile(`https://cadastre.data.gouv.fr/data/etalab-cadastre/${dateCadastre}/geojson/communes/${codeDepartement}/${code}/${fileName}`
    		,filePath)
    }
}

function downloadToFile(url, filename, onComplete) {
	return new Promise(function (resolve, reject) {
		console.log('downloading: ' + url)
		var req = https.get(url, res => {
			// reject on bad status code
			if (res.statusCode < 200 || res.statusCode >= 300) {
				return reject(new Error('statusCode=' + res.statusCode))
			}

	   		const file = fs.createWriteStream(filename)
			
			res.on('data', function (chunk) {
				file.write(chunk)
			})

			res.on('end', function () { 
				try {
					file.close(onComplete)
				} catch (e) {
					reject(e)
				}
				resolve(true)
			})
		})

		req.on('error', (error) => {
			fs.unlink(filename)
			reject(err)
		})

		req.end();
	})
}

main().catch(error => {
	console.error(error)
	process.exit(1)
})