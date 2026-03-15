const Command = require('../../base/Command.js');
const { Duration, DateTime } = require('luxon');
const { EmbedBuilder } = require('discord.js');

class BuyItem extends Command {
  constructor(client) {
    super(client, {
      name: 'buy-item',
      category: 'Items',
      description: 'Buy an item from the store.',
      usage: 'buy-item [quantity] <item>',
      examples: ['buy pizza'],
      aliases: ['buy'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let quantity = 1;
    let itemName = args.join(' ').toLowerCase();
    if (!isNaN(args[0])) {
      quantity = parseInt(args[0]);
      if (quantity <= 0) {
        return msg.reply('Invalid `[quantity]` argument given. Cannot be less than 1');
      }
      args.shift();
      itemName = args.join(' ').toLowerCase();
      if (!itemName) {
        return msg.reply('Invalid `<item name>` argument given');
      }
    }

    if (!itemName) return msg.reply('Please specify an item to buy.');

    const [storeRows] = await this.client.db.execute(
      /* sql */
      `
        SELECT
          *
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

    const item = storeRows[0];
    const itemCost = BigInt(item.cost);

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
      [msg.guild.id, msg.member.id],
    );
    const userCash = BigInt(balanceRows[0]?.cash ?? economyRows[0]?.start_balance ?? 0);
    if (userCash < itemCost * BigInt(quantity)) return msg.reply('You do not have enough money to buy this item.');

    if (item.stock !== -1 && item.stock < quantity) {
      return msg.reply(`The store only has ${item.stock} stock remaining.`);
    }

    if (item.stock !== -1) {
      item.stock -= quantity;
      if (item.stock === 0) {
        await this.client.db.execute(
          /* sql */ `
            DELETE FROM economy_store
            WHERE
              server_id = ?
              AND item_id = ?
          `,
          [msg.guild.id, item.item_id],
        );
      } else {
        await this.client.db.execute(
          /* sql */ `
            UPDATE economy_store
            SET
              stock = ?
            WHERE
              server_id = ?
              AND item_id = ?
          `,
          [item.stock, msg.guild.id, item.item_id],
        );
      }
    }

    if (item.role_required) {
      const roleRequired = this.client.util.getRole(msg, item.role_required);
      if (roleRequired) {
        // Check if the member has the role
        const hasRole = msg.member.roles.cache.has(roleRequired.id);
        if (!hasRole) {
          return msg.reply(`You do not have the required role **${roleRequired.name}** to purchase this item.`);
        }
      }
    }

    if (item.role_given || item.role_removed) {
      if (!msg.guild.members.me.permissions.has('ManageRoles'))
        return this.client.util.errorEmbed(
          msg,
          'Manage Roles permission is required on the bot to buy this item.',
          'Missing Permission',
        );
    }

    // Deduct the cost from the user's cash
    const amount = itemCost * BigInt(quantity);
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
      [msg.guild.id, msg.member.id, amount.toString()],
    );

    if (!item.inventory) {
      if (item.role_given) {
        const role = this.client.util.getRole(msg, item.role_given);
        await msg.member.roles.add(role).catch((error) => msg.channel.send(error));
      }
      if (item.role_removed) {
        const role = this.client.util.getRole(msg, item.role_removed);
        await msg.member.roles.remove(role).catch((error) => msg.channel.send(error));
      }
      if (!item.reply_message) {
        return msg.channel.send('👍');
      }

      // Replace Member
      // Calculate the duration since the member's account was created
      const memberCreatedDuration = Duration.fromMillis(Date.now() - msg.author.createdAt.getTime())
        .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
        .toHuman({ maximumFractionDigits: 2, showZeros: false });

      // Format the member's account creation date
      const memberCreated = DateTime.fromMillis(msg.author.createdAt.getTime()).toFormat('MMMM dd, yyyy');

      let replyMessage = item.reply_message
        .replace(/\{member\.id\}/gi, msg.author.id)
        .replace(/\{member\.username\}/gi, msg.author.username)
        .replace(/\{member\.tag\}/gi, msg.author.tag)
        .replace(/\{member\.mention\}/gi, msg.author.toString())
        .replace(/\{member\.created\}/gi, memberCreated)
        .replace(/\{member\.created\.duration\}/gi, memberCreatedDuration);

      // Replace Server
      // Calculate the duration since the server was created
      const serverCreatedDuration = Duration.fromMillis(Date.now() - msg.guild.createdAt.getTime())
        .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
        .toHuman({ maximumFractionDigits: 2, showZeros: false });

      // Format the server's creation date
      const serverCreated = DateTime.fromMillis(msg.guild.createdAt.getTime()).toFormat('MMMM dd, yyyy');

      replyMessage = replyMessage
        .replace(/\{server\.id\}/gi, msg.guild.id)
        .replace(/\{server\.name\}/gi, msg.guild.name)
        .replace(/\{server\.members\}/gi, msg.guild.memberCount.toLocaleString())
        .replace(/\{server\.created\}/gi, serverCreated)
        .replace(/\{server\.created\.duration\}/gi, serverCreatedDuration);

      const role =
        this.client.util.getRole(msg, item.role_given) ||
        this.client.util.getRole(msg, item.role_removed) ||
        this.client.util.getRole(msg, item.role_required);

      if (role) {
        // Calculate the duration since the role was created
        const roleCreatedDuration = Duration.fromMillis(Date.now() - role.createdAt.getTime())
          .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
          .toHuman({ maximumFractionDigits: 2, showZeros: false });

        // Format the role's creation date
        const roleCreated = DateTime.fromMillis(role.createdAt.getTime()).toFormat('MMMM dd, yyyy');

        replyMessage = replyMessage
          .replace(/\{role\.id\}/gi, role.id)
          .replace(/\{role\.name\}/gi, role.name)
          .replace(/\{role\.mention\}/gi, role)
          .replace(/\{role\.members\}/gi, role.members.size.toLocaleString())
          .replace(/\{role\.created\}/gi, roleCreated)
          .replace(/\{role\.created\.duration\}/gi, roleCreatedDuration);
      }
      return msg.channel.send(replyMessage);
    }

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
        msg.author.id,
        item.item_id,
        item.item_name,
        quantity,
        item.cost,
        item.description,
        item.inventory,
        item.time_remaining,
        item.role_required,
        item.role_given,
        item.role_removed,
        item.reply_message,
      ],
    );

    const itemCostQuantity = (itemCost * BigInt(quantity)).toLocaleString();
    const csCost = this.client.util.limitStringLength(currencySymbol + itemCostQuantity, 0, 700);

    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setTitle('Purchase Successful')
      .setDescription(
        `You have bought ${quantity} ${item.item_name}${
          quantity > 1 ? "'s" : ''
        } for ${csCost}! This is now in your inventory. \nUse this item with the \`use-item\` command.`,
      )
      .setColor(msg.settings.embedColor)
      .setTimestamp();

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = BuyItem;
