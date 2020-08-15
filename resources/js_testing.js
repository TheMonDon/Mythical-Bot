/* eslint-disable no-undef */
const mysql = require('mysql');

(async () => {
  const pages = []
  const connection = mysql.createConnection({
    host: '192.168.2.31',
    user: 'craftersisland',
    password: 'Jmonahan13',
    database: 'litebans'
  })

  connection.connect(function (err) {
    if (err) {
      console.error(err)
    }
    console.log(`Connected as ID: ${connection.threadId}`)
  })

  connection.query('SELECT * FROM litebans_bans', function (error, results) {
    if (error) console.error(error)
    const items = results.filter(m => m.banned_by_name === 'TheMonDon')
    console.log(items)
    for (i = 0; i < items.length; i++) {

    }
  })
})()
