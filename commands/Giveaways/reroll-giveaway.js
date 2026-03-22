const Command = require('../../base/Command.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { parseStoredUserIds, selectGiveawayWinners, mergeWinnerHistory } = require('../../util/GiveawayUtil.js');

class RerollGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'reroll-giveaway',
      description: 'Reroll a giveaway',
      usage: 'reroll-giveaway <Message ID> [winners]',
      requiredArgs: 1,
      category: 'Giveaways',
      aliases: ['reroll', 'rerollgiveaway'],
      examples: ['reroll-giveaway 123456789012345678', 'reroll-giveaway 123456789012345678 3'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const messageId = args[0];
    let winnersCount = args[1] ? parseInt(args[1], 10) : null;

    if (isNaN(messageId)) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Message ID');
    }

    if (winnersCount && isNaN(winnersCount)) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Winners Count');
    }

    const [giveawayRows] = await this.client.db.execute(
      /* sql */
      `
        SELECT
          *
        FROM
          giveaways
        WHERE
          message_id = ?
          AND server_id = ?
      `,
      [messageId, msg.guild.id],
    );

    if (!giveawayRows.length) {
      return this.client.util.errorEmbed(msg, `Unable to find a giveaway for \`"${messageId}"\`.`);
    }
    const giveaway = giveawayRows[0];

    if (giveaway.status === 'active') {
      return this.client.util.errorEmbed(msg, 'This giveaway is still active!');
    }

    const channel = await this.client.channels.fetch(giveaway.channel_id).catch(() => null);
    if (!channel) {
      return this.client.util.errorEmbed(msg, 'Unable to find the channel for this giveaway.');
    }

    const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
    if (!message) {
      return this.client.util.errorEmbed(msg, 'Unable to find the message for this giveaway.');
    }

    winnersCount = winnersCount || giveaway.winner_count;

    const [entriesResult] = await this.client.db.execute(
      /* sql */ `
        SELECT
          user_id
        FROM
          giveaway_entries
        WHERE
          message_id = ?
          AND server_id = ?
      `,
      [giveaway.message_id, msg.guild.id],
    );

    const entryCount = entriesResult.length;
    const entryUserIds = entriesResult.map((row) => row.user_id);
    const previousWinnerIds = parseStoredUserIds(giveaway.winner_history || giveaway.winners);
    const { eligibleEntryCount, winners } = selectGiveawayWinners(entryUserIds, previousWinnerIds, winnersCount);

    if (winners.length === 0) {
      const reason =
        previousWinnerIds.length >= entryCount
          ? 'Everyone who entered has already won this giveaway.'
          : 'There were no eligible entries to reroll.';

      return this.client.util.errorEmbed(msg, reason, 'Unable to Reroll Giveaway');
    }

    const winnerHistory = mergeWinnerHistory(previousWinnerIds, winners);

    await this.client.db.execute(
      /* sql */ `
        UPDATE giveaways
        SET
          status = 'ended',
          winners = ?,
          winner_history = ?
        WHERE
          server_id = ?
          AND message_id = ?
      `,
      [JSON.stringify(winners), JSON.stringify(winnerHistory), giveaway.server_id, giveaway.message_id],
    );

    const embed = EmbedBuilder.from(message.embeds[0]).setFields([
      {
        name: '🎁 Giveaway Information',
        value: `**Ended:** <t:${Math.floor(giveaway.end_at / 1000)}:R>\n**Hosted by:** <@${giveaway.host_id}>${giveaway.required_role ? `\n**Required Role:** <@&${giveaway.required_role}>` : ''}`,
      },
    ]);

    const disabledButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_enter')
        .setLabel(`Enter (${entryCount})`)
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
    );

    await message.edit({ embeds: [embed], components: [disabledButton] });

    const winnerMentions = winners.map((id) => `<@${id}>`).join(', ');
    await message.reply(`Congratulations ${winnerMentions}! You won the **${giveaway.prize}** giveaway!`);

    const unavailableCount = Math.max(0, entryCount - eligibleEntryCount);

    return msg.reply(
      `Giveaway rerolled successfully! Selected ${winners.length} new winner${winners.length === 1 ? '' : 's'} and excluded ${unavailableCount} previous winner${unavailableCount === 1 ? '' : 's'}.`,
    );
  }
}

module.exports = RerollGiveaway;
