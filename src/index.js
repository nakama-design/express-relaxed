require('dotenv').config('.env')

const Fs = require('fs')
const Path = require('path')
const Cors = require('cors')
const Slugify = require('slugify')
const Express = require('express')
const Render = require('./renderer')
const Parser = require('body-parser')
const Execute = require('promise-exec')

const { createFile, createGraph } = require('./utils')

const app = Express()

const host = process.env.HOST
const port = process.env.PORT

app.use(Cors())
app.use(Parser.urlencoded({ extended: false }))
app.use(Parser.json())

// Running example
app.use(Express.static(Path.join(process.cwd(), 'example')))

app.post('/', async (req, res) => {
  const { name, theme, content, charts } = req.body

  const diagram = await createGraph(charts)
  const markdown = await createFile(name, content, 'md')
  const { file, fileName } = await createFile(Slugify(name), Render(name, theme, content, diagram, markdown), 'pug')

  await Execute(`relaxed ${file} --build-once`)
  await Execute('find ./build -type f -not -name "*.yml" -not -name "*.pdf" -delete')

  res.json({
    name: fileName
  })
})

app.get('/preview/:name', (req, res) => {
  const data = Fs.readFileSync(Path.resolve(process.cwd(), 'build', req.params.name + '.pdf'))

  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-disposition': 'inline;filename=' + req.params.name + '.pdf',
    'Content-Length': data.length
  })

  res.end(new Buffer(data, 'binary'))
})

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Express Relaxed</title>
      <style>
        html,
        body {
          padding: 0;
          margin: 0;
        }
        body {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: 300;
          font-family: sans-serif;
          color: #ABABAB;
        }
      </style>
    </head>
    <body>
      <div>Welcome to Express relaxed</div>
    </body>
    </html>
  `)
})

app.listen(port)

console.log(`Server listening on http://${host}:${port}`)