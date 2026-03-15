const Command = require('../../base/Command.js');
const { Duration, DateTime } = require('luxon');

class UseItem extends Command {
  constructor(client) {
    super(client, {
      name: 'use-item',
      category: 'Items',
      description: 'Use an item from your inventory.',
      usage: 'use-item [quantity] <item name>',
      aliases: ['useitem', 'use'],
      guildOnly: true,
      requiredArgs: 1,
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

    if (inventoryRows.length === 0) {
      return msg.reply('You do not have this item in your inventory.');
    }

    const item = inventoryRows[0];

    if (item.role_required) {
      const roleRequired = this.client.util.getRole(msg, item.role_required);
      if (roleRequired) {
        // Check if the member has the role
        const hasRole = msg.member.roles.cache.has(roleRequired.id);
        if (!hasRole) {
          return msg.reply(`You do not have the required role **${roleRequired.name}** to use this item.`);
        }
      }
    }

    const itemAmount = item.quantity - quantity;

    if (itemAmount < 0) {
      return this.client.util.errorEmbed(msg, `You only have ${item.quantity} of this item in your inventory.`);
    }

    if (item.quantity > quantity) {
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
        [quantity, msg.guild.id, msg.author.id, item.item_id, item.item_name],
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
        [msg.guild.id, msg.author.id, item.item_id, item.item_name],
      );
    }

    if (item.role_given) {
      const roleGiven = this.client.util.getRole(msg, item.role_given);
      await msg.member.roles.add(roleGiven).catch((error) => msg.channel.send(error));
    }
    if (item.role_removed) {
      const roleRemoved = this.client.util.getRole(msg, item.role_removed);
      await msg.member.roles.remove(roleRemoved).catch((error) => msg.channel.send(error));
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
      .replace(/\{member\.mention\}/gi, msg.author)
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
}

module.exports = UseItem;
