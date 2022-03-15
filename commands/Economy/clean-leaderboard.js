const Command = require('../../base/Command.js');
const { verify } = require('../../util/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class CleanLeaderboard extends Command {
  constructor (client) {
    super(client, {
      name: 'clean-leaderboard',
      category: 'Economy',
      description: 'Clean the leaderboard of users no longer in the guild.',
      usage: 'clean-leaderboard',
      aliases: ['cl', 'cleanleaderboard', 'clean-lb'],
      permLevel: 'Moderator',
      guildOnly: true
    });
  }

  async run (msg) {
    const users = db.get(`servers.${msg.guild.id}.users`) || {};
    const toRemove = [];

    const em = new DiscordJS.MessageEmbed()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setColor('ORANGE')
      .setDescription('Please wait, this may take a while for bigger servers.');
    const message = await msg.channel.send({ embeds: [em] });

    await msg.guild.members.fetch();
    for (const i in users) {
      if (!msg.guild.members.cache.get(i)) toRemove.push(i);
    }

    if (toRemove.length === 0) {
      em.setColor('#0099CC');
      em.setDescription('There are no users to remove from the leaderboard.');
      return message.edit(em);
    }

    em.setColor('#0099CC');
    em.setDescription(`This will reset the balance and remove ${toRemove.length} members from the leaderboard. \nDo you wish to continue? (yes/no)`);
    await message.edit(em);
    const verified = await verify(msg.channel, msg.author);

    if (verified) {
      toRemove.forEach(i => {
        db.delete(`servers.${msg.guild.id}.users.${i}`);
      });
      return msg.channel.send(`${toRemove.length} users have been removed from the leaderboard.`);
    } else {
      return msg.channel.send('Command Cancelled.');
    }
  }
}

module.exports = CleanLeaderboard;
