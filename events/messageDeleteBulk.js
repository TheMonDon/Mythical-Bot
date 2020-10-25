const db = require('quick.db');
const DiscordJS = require('discord.js');
const nodefetch = require('node-fetch');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  // eslint-disable-next-line no-unused-vars
  async run (messages) {
    const server = messages.first().guild;
    const chan = messages.first().channel;

    const logChan = db.get(`servers.${server.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${server.id}.logs.log_system.bulk-messages-deleted`);
    if (logSys !== 'enabled') return;

    const chans = db.get(`servers.${server.id}.logs.noLogChans`);
    if (chans.includes(chan.id)) return;
    const logChannel = server.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

    const output = [];
    output.push(`${messages.size} messages deleted in ${chan.name}:`);
    output.push('\n');
    output.push('\n');
    messages.forEach(m => {
      output.push(`${m.author.tag} (User ID: ${m.author.id} Mesage ID: ${m.id})\n`);
      output.push(m.content ? m.content : 'No text included in this message, or it was an embed.');
      output.push('\n');
      output.push('\n');
    });
    const text = output.join('');
    nodefetch('https://voidbin.cc/api/new', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Messages Deleted',
        content: text,
        code_language: 'text',
        paste_expiration: '6mo',
        view_destroy: false
      }),
      headers: { 'Content-Type': 'application/json' }
    })
      .then(c => c.json())
      .then(c => {
        const link = `https://voidbin.cc/paste/${c.pasteID}`;

        const embed = new DiscordJS.MessageEmbed()
          .setTitle('Bulk Messages Deleted')
          .setColor('RED')
          .addField('Deleted Messages', link, true)
          .addField('Deleted Amount', messages.size, true)
          .addField('Channel', chan, true);
        logChannel.send(embed);
  
        db.add(`servers.${server.id}.logs.bulk-messages-deleted`, 1);
        db.add(`servers.${server.id}.logs.all`, 1);
      })
      .catch(err => console.log(err));
  }
};