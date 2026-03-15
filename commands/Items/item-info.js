const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class ItemInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'item-info',
      category: 'Items',
      description: 'View information about an item.',
      usage: 'item-info <item name>',
      aliases: ['iteminfo'],
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const itemName = args.join(' ').toLowerCase();

    const [storeRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_store
        WHERE
          server_id = ?
          AND LOWER(item_name) = ?
      `,
      [msg.guild.id, itemName],
    );

    let item = storeRows[0];
    if (!item) {
      const [inventoryRows] = await this.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_inventory
          WHERE
            server_id = ?
            AND user_id = ?
            AND LOWER(item_name) = ?
        `,
        [msg.guild.id, msg.member.id, itemName],
      );
      item = inventoryRows[0];

      if (!item) {
        return this.client.util.errorEmbed(msg, 'That item does not exist in the store or your inventory.');
      }
    }
 
    const [economyRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );
    const currencySymbol = economyRows[0]?.symbol || '$';

    const cost = currencySymbol + BigInt(item.cost).toLocaleString();
    const requiredBalance = item.required_balance
      ? currencySymbol + BigInt(item.required_balance).toLocaleString()
      : 'None';
    const timeRemainingString = item.time_remaining
      ? `Deleted <t:${Math.floor(item.time_remaining / 1000)}:R>`
      : 'No time limit';

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setTitle('Item Info')
      .addFields([
        { name: 'Name', value: item.item_name, inline: true },
        { name: 'Cost', value: this.client.util.limitStringLength(cost, 0, 1024), inline: true },
        { name: 'Description', value: item.description, inline: false },
        { name: 'Show in Inventory?', value: item.inventory ? 'Yes' : 'No', inline: true },
        { name: 'Time Remaining', value: timeRemainingString, inline: true },
        { name: 'Stock Remaining', value: item.stock !== -1 ? item.stock.toLocaleString() : 'Infinity', inline: true },
        {
          name: 'Role Required',
          value: item.role_required ? this.client.util.getRole(msg, item.role_required).toString() : 'None',
          inline: true,
        },
        {
          name: 'Role Given',
          value: item.role_given ? this.client.util.getRole(msg, item.role_given).toString() : 'None',
          inline: true,
        },
        {
          name: 'Role Removed',
          value: item.role_removed ? this.client.util.getRole(msg, item.role_removed).toString() : 'None',
          inline: true,
        },
        {
          name: 'Required Balance',
          value: this.client.util.limitStringLength(requiredBalance, 0, 1024),
          inline: true,
        },
        { name: 'Reply Message', value: item.reply_message || 'None', inline: true },
      ]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ItemInfo;
