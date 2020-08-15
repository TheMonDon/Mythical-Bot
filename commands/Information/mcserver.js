const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-fetch');

class mcserver extends Command {
  constructor (client) {
    super(client, {
      name: 'mcserver',
      description: 'Get information about a minecraft server.',
      usage: 'mcserver',
      category: 'Information',
      aliases: ['mcs']
    });
  }

  async run (msg, text) { // eslint-disable-line no-unused-vars
    let query = text.join(' ');
    if (!query) query = 'mc.crafters-island.com';

    fetch(`https://api.mcsrvstat.us/2/${query}`)
      .then(res => res.json())
      .then(body => {
        const em = new DiscordJS.MessageEmbed()
          .setTitle('Minecraft Server Stats')
          .setAuthor(msg.member.user.username, msg.member.user.displayAvatarURL())
          .setColor('#2ecc71')
          .addField('IP Address:', body.hostname, false)
          .addField('Version:', body.version, false)
          .addField('Players:', `${body.players.online}/${body.players.max}`, false)
          .addField('MOTD:', body.motd.clean, false);
        msg.channel.send(em);
      });
  }
}

module.exports = mcserver;
