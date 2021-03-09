const Command = require('../../base/Command.js');
const { verify } = require('../../base/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class cleanLeaderboard extends Command {
  constructor (client) {
    super(client, {
      name: 'clean-leaderboard',
      category: 'Economy',
      description: 'Set the starting balance for the server',
      usage: 'clean-leaderboard',
      aliases: ['cl', 'cleanleaderboard', 'clean-lb'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    if (!msg.member.permissions.has('MANAGE_GUILD')) return msg.channel.send('You are missing **Manage Guild** permission.');

    const users = db.get(`servers.${msg.guild.id}.users`) || {};
    const toRemove = [];

    for (const i in users) {
      if (!msg.guild.members.cache.get(i)) toRemove.push(i);
    }

    if (toRemove.length === 0) return msg.channel.send('There are no users to remove from the leaderboard.');

    const em = new DiscordJS.MessageEmbed()
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setColor('0099CC')
      .setDescription(`This will reset the balance of and remove ${toRemove.length} members from the leaderboard. \nDo you wish to continue? (yes/no)`);
    await msg.channel.send(em);
    const verified = await verify(msg.channel, msg.author);

    if (verified) {
      toRemove.forEach(i => {
        db.delete(`servers.${msg.guild.id}.users.${i}`);
      });
      return msg.channel.send(`Removed ${toRemove.length} users from the leaderboard.`);
    } else {
      return msg.channel.send('Command Cancelled.');
    }
  }
};
