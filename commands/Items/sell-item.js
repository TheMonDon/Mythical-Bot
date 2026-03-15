const Command = require('../../base/Command.js');
const { MessageCollector, EmbedBuilder } = require('discord.js');

class SellItem extends Command {
  constructor(client) {
    super(client, {
      name: 'sell-item',
      category: 'Items',
      description: 'Sell an item to another member.',
      usage: 'sell-item <member> [quantity] <item name>',
      examples: ['sell-item @User 2 pizza'],
      aliases: ['sell', 'sellitem'],
      guildOnly: true,
      requiredArgs: 2,
    });
  }

  async run(msg, args) {
    // Parse the member, quantity, and item name from the arguments
    const member = await this.client.util.getMember(msg, args[0]);
    if (!member) return msg.reply('Please mention a valid member to sell the item to.');

    let quantity = 1; // Default quantity
    let itemName = args.slice(1).join(' ').toLowerCase();

    // Check if a quantity is specified and parse it
    if (!isNaN(args[1])) {
      quantity = parseInt(args[1], 10);
      if (quantity <= 0) return msg.reply('Please enter a valid quantity.');
      itemName = args.slice(2).join(' ').toLowerCase();
    }

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

    const sellerItem = inventoryRows[0];

    if (!sellerItem) {
      return this.client.util.errorEmbed(msg, 'You do not have this item in your inventory.');
    }

    if (sellerItem.quantity < quantity) {
      return this.client.util.errorEmbed(msg, 'You do not have enough of this item in your inventory.');
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

    // Ask the seller for a price
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setDescription(
        `What price do you want to sell ${member} ${quantity} ${sellerItem.item_name}${quantity > 1 ? "'s" : ''}?`,
      );
    await msg.channel.send({ embeds: [embed] });

    const filter = (response) => response.author.id === msg.author.id;
    const collector = new MessageCollector(msg.channel, { filter, time: 120000, max: 1 });

    collector.on('collect', async (priceMsg) => {
      const price = parseInt(priceMsg.content, 10);
      if (isNaN(price) || price < 0) {
        return msg.reply('Invalid price. The sale has been canceled.');
      }

      // Check buyer's balance
      const [balanceRows] = await this.client.db.execute(
        /* sql */ `
          SELECT
            cash
          FROM
            economy_balances
          WHERE
            server_id = ?
            AND user_id = ?
        `,
        [msg.guild.id, member.id],
      );
      const buyerCash = BigInt(balanceRows[0]?.cash ?? economyRows[0]?.start_balance ?? 0);

      const totalCost = BigInt(price);
      if (buyerCash < totalCost) {
        const noMoneyEmbed = new EmbedBuilder().setDescription(`${member} does not have enough cash to afford this.`);
        return msg.channel.send({ embeds: [noMoneyEmbed] });
      }

      // Ask the buyer for confirmation
      const confirmEmbed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setDescription(
          `${msg.author} wants to sell you ${quantity}x ${sellerItem.item_name}${
            quantity > 1 ? "'s" : ''
          } for ${currencySymbol}${price}. \nDo you accept this? (yes/no)`,
        )
        .setFooter({ text: `Deal ends in 5 minutes` });
      await msg.channel.send({ content: member.toString(), embeds: [confirmEmbed] });

      const confirmFilter = (response) => response.author.id === member.id;
      const confirmCollector = new MessageCollector(msg.channel, { filter: confirmFilter, time: 300000, max: 1 });

      confirmCollector.on('collect', async (confirmation) => {
        if (this.client.util.yes.includes(confirmation.content.toLowerCase())) {
          // Transfer money and update inventories

          // Update buyer's cash
          await this.client.db.execute(
            /* sql */
            `
              INSERT INTO
                economy_balances (server_id, user_id, cash)
              VALUES
                (?, ?, ?) ON DUPLICATE KEY
              UPDATE cash = cash -
              VALUES
                (cash)
            `,
            [msg.guild.id, member.id, totalCost.toString()],
          );

          // Update seller's cash
          await this.client.db.execute(
            /* sql */
            `
              INSERT INTO
                economy_balances (server_id, user_id, cash)
              VALUES
                (?, ?, ?) ON DUPLICATE KEY
              UPDATE cash = cash +
              VALUES
                (cash)
            `,
            [msg.guild.id, msg.member.id, totalCost.toString()],
          );

          // Update seller's inventory
          if (sellerItem.quantity > quantity) {
            await this.client.db.execute(
              /* sql */
              `
                UPDATE economy_inventory
                SET
                  quantity = quantity - ?
                WHERE
                  server_id = ?
                  AND user_id = ?
                  AND item_id = ?
                  AND item_name = ?
              `,
              [quantity, msg.guild.id, msg.author.id, sellerItem.item_id, sellerItem.item_name],
            );
          } else {
            await this.client.db.execute(
              /* sql */
              `
                DELETE FROM economy_inventory
                WHERE
                  server_id = ?
                  AND user_id = ?
                  AND item_id = ?
                  AND item_name = ?
              `,
              [msg.guild.id, msg.author.id, sellerItem.item_id, sellerItem.item_name],
            );
          }

          // Update buyer's inventory
          await this.client.db.execute(
            /* sql */
            `
              INSERT INTO
                economy_inventory (
                  server_id,
                  user_id,
                  item_id,
                  item_name,
                  quantity,
                  cost,
                  description,
                  inventory,
                  time_remaining,
                  role_required,
                  role_given,
                  role_removed,
                  reply_message
                )
              VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY
              UPDATE quantity = quantity +
              VALUES
                (quantity),
                item_name =
              VALUES
                (item_name),
                cost =
              VALUES
                (cost),
                description =
              VALUES
                (description),
                inventory =
              VALUES
                (inventory),
                time_remaining =
              VALUES
                (time_remaining),
                role_required =
              VALUES
                (role_required),
                role_given =
              VALUES
                (role_given),
                role_removed =
              VALUES
                (role_removed),
                reply_message =
              VALUES
                (reply_message)
            `,
            [
              msg.guild.id,
              member.id,
              sellerItem.item_id,
              sellerItem.item_name,
              quantity,
              sellerItem.cost,
              sellerItem.description,
              sellerItem.inventory,
              sellerItem.time_remaining,
              sellerItem.role_required,
              sellerItem.role_given,
              sellerItem.role_removed,
              sellerItem.reply_message,
            ],
          );

          // Send confirmation message
          const confirmEmbed = new EmbedBuilder()
            .setColor(msg.settings.embedColor)
            .setDescription(
              `✅ Trade Complete \n${member} has received ${quantity}x ${sellerItem.item_name}${
                quantity > 1 ? 's' : ''
              } for ${currencySymbol}${price} from ${msg.author}`,
            );

          return msg.channel.send({ embeds: [confirmEmbed] });
        } else {
          this.client.util.errorEmbed(
            msg,
            'The buyer declined the offer. The sale has been canceled.',
            'Offer Declined',
          );
        }
      });

      confirmCollector.on('end', (collected) => {
        if (collected.size === 0) {
          const noCollectionEmbed = new EmbedBuilder()
            .setColor(msg.settings.embedErrorColor)
            .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
            .setDescription(
              `Cancelled the transaction of ${quantity}x ${sellerItem.item_name}${
                quantity > 1 ? "'s" : ''
              } for ${currencySymbol}${price} between ${msg.author} and ${member}.`,
            );
          return msg.channel.send({ embeds: [noCollectionEmbed] });
        }
      });
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        const noCollectionEmbed = new EmbedBuilder()
          .setColor(msg.settings.embedErrorColor)
          .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
          .setDescription(
            `Cancelled the transaction of ${quantity}x ${sellerItem.item_name}${
              quantity > 1 ? "'s" : ''
            } between ${msg.author} and ${member}.`,
          );
        msg.channel.send({ embeds: [noCollectionEmbed] });
      }
    });
  }
}

module.exports = SellItem;
