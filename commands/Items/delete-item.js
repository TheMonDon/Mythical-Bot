const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class DeleteItem extends Command {
  constructor(client) {
    super(client, {
      name: 'delete-item',
      category: 'Items',
      description: 'Delete an item from the store.',
      usage: 'delete-item <item name>',
      aliases: ['deleteitem', 'delitem'],
      permLevel: 'Administrator',
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const itemName = args.join(' ').toLowerCase();

    const [storeRows] = await this.client.db.execute(
      /* sql */
      `
        SELECT
          item_id
        FROM
          economy_store
        WHERE
          server_id = ?
          AND LOWER(item_name) = LOWER(?)
      `,
      [msg.guild.id, itemName],
    );

    if (storeRows.length === 0) {
      return this.client.util.errorEmbed(msg, 'That item does not exist in the store.');
    }

    await this.client.db.execute(
      /* sql */ `
        DELETE FROM economy_store
        WHERE
          server_id = ?
          AND item_id = ?
      `,
      [msg.guild.id, storeRows[0].item_id],
    );

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setDescription('Item has been removed from the store.');

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = DeleteItem;
