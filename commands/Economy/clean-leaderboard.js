const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class CleanLeaderboard extends Command {
  constructor(client) {
    super(client, {
      name: 'clean-leaderboard',
      category: 'Economy',
      description: 'Clean the leaderboard of users no longer in the guild',
      usage: 'clean-leaderboard',
      aliases: ['cl', 'cleanleaderboard', 'clean-lb'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg) {
    const users = (await db.get(`servers.${msg.guild.id}.users`)) || {};
    const toRemove = [];
    const color = msg.settings.embedColor;

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setColor('#FFA500')
      .setDescription('Please wait, this may take a while for bigger servers.');

    const message = await msg.channel.send({ embeds: [em] });

    await msg.guild.members.fetch();
    for (const i in users) {
      if (!msg.guild.members.cache.get(i)) toRemove.push(i);
    }

    if (toRemove.length === 0) {
      em.setColor(color).setDescription('There are no users to remove from the leaderboard.');
      return message.edit({ embeds: [em] });
    }

    em.setColor(color).setDescription(
      `This will reset the balance and remove ${toRemove.length} members from the leaderboard. \nDo you wish to continue? (yes/no)`,
    );

    await message.edit({ embeds: [em] });
    const verified = await this.client.util.verify(msg.channel, msg.author);

    if (verified) {
      for (const i of toRemove) {
        await db.delete(`servers.${msg.guild.id}.users.${i}`);
      }

      return msg.channel.send(`${toRemove.length} users have been removed from the leaderboard.`);
    } else {
      return msg.channel.send('Command Cancelled.');
    }
  }
}

module.exports = CleanLeaderboard;
