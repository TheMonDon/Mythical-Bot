const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const pjson = require('../../package.json')

class about extends Command {
  constructor (client) {
    super(client, {
      name: 'about',
      description: 'View the bot info.',
      usage: 'about',
      category: 'General',
      aliases: ['info', 'owner']
    });
  }

  async run (msg) {
    const em = new DiscordJS.MessageEmbed()
    .setTitle('Bot Info')
    .setAuthor(this.client.user.username, this.client.user.displayAvatarURL())
    .addField('Version', pjson.version, true)
    .addField('Library', 'Discord.JS', true)
    .addField('Creator', pjson.owner, true)
    .addField('Invite', '[cisn.xyz/mythical](https://cisn.xyz/mythical)', true);
    return msg.channel.send(em)
  }
}

module.exports = about;
