const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

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
      cooldown: 60,
    });
  }

  async run(msg) {
    const color = msg.settings.embedColor;

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setColor('#FFA500')
      .setDescription('Checking database for members who have left...');

    const message = await msg.channel.send({ embeds: [em] });

    // 1. Fetch all current members into the cache to ensure accuracy
    await msg.guild.members.fetch();
    const currentMemberIds = Array.from(msg.guild.members.cache.keys());

    // 2. Find users in the DB who are NOT in the current member list
    // This query selects user_ids that exist for this server but aren't in our array
    const [toRemoveRows] = await this.client.db.execute(
      /* sql */
      `
        SELECT
          user_id
        FROM
          economy_balances
        WHERE
          server_id = ?
          AND user_id NOT IN (${currentMemberIds.map(() => '?').join(',')})
      `,
      [msg.guild.id, ...currentMemberIds],
    );

    const toRemoveCount = toRemoveRows.length;

    if (toRemoveCount === 0) {
      em.setColor(color).setDescription('The leaderboard is already clean! No ghost users found.');
      return message.edit({ embeds: [em] });
    }

    // 3. Ask for confirmation
    em.setColor(color).setDescription(
      `Found **${toRemoveCount}** users in the database who are no longer in this server.\n\nDo you wish to remove them from the leaderboard? (yes/no)`,
    );

    await message.edit({ embeds: [em] });
    const verified = await this.client.util.verify(msg.channel, msg.author);

    if (verified) {
      // 4. Delete the ghost users in one single query
      const userIdsToDelete = toRemoveRows.map((row) => row.user_id);

      await this.client.db.execute(
        /* sql */
        `
          DELETE FROM economy_balances
          WHERE
            server_id = ?
            AND user_id IN (${userIdsToDelete.map(() => '?').join(',')})
        `,
        [msg.guild.id, ...userIdsToDelete],
      );

      em.setDescription(`✅ Successfully removed **${toRemoveCount}** users from the database.`);
      return message.edit({ embeds: [em] });
    } else {
      return msg.channel.send('Command Cancelled.');
    }
  }
}

module.exports = CleanLeaderboard;
