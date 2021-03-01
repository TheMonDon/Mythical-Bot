const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');

class mcserver extends Command {
  constructor(client) {
    super(client, {
      name: 'mc-server',
      description: 'Get information about a Minecraft server.',
      usage: 'mc-server <IP Address>',
      category: 'Minecraft',
      aliases: ['mcs', 'mcserver', 'stats', 'mcstats', 'mcip']
    });
  }

  async run(msg, text) {
    let query = text.join(' ');
    if (!query) query = 'mc.crafters-island.com';

    const servers = {
      'crafters-island': 'mc.crafters-island.com',
      'hypixel': 'mc.hypixel.net',
      'skycade': 'play.skycade.net',
      'mineplex': 'us.mineplex.com',
      '2b2t': '2b2t.org',
      'mcprison': 'mcprison.com',
      'purpleprison': 'purpleprison.net'
    }

    query = servers[query.toString()] ? servers[query.toString()] : query;

    const { body } = await fetch
      .get(`https://api.mcsrvstat.us/2/${query}`)
      .catch('Sorry, either that is not a valid IP or that server is offline.')

    if (!body.online) return msg.channel.send(`Sorry, either that is not a valid IP or that server is offline.`);

    const em = new DiscordJS.MessageEmbed()
      .setTitle('Minecraft Server Stats')
      .setAuthor(msg.author.username, msg.author.displayAvatarURL())
      .setColor('#2ecc71')
      .addField('IP Address:', `${body.hostname || body.ip + (body.port !== '25565' ? `:${body.port}` : '')} `, false)
      .addField('Version:', body.version, false)
      .addField('Players:', `${body.players.online}/${body.players.max}`, false)
      .addField('MOTD:', body.motd.clean, false);
    return msg.channel.send(em);
  }
}

module.exports = mcserver;
