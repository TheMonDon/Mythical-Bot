const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
require('moment-duration-format');
const moment = require('moment');
const db = new QuickDB();

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

    // Fetch user's inventory from the database
    const userInventory = (await db.get(`servers.${msg.guild.id}.users.${msg.author.id}.economy.inventory`)) || [];

    // Find the item in the store regardless of case
    const itemIndex = userInventory.findIndex((inventoryItem) => inventoryItem?.name?.toLowerCase() === itemName);

    // Check if the item exists in the user's inventory
    if (!userInventory[itemIndex]) {
      return msg.reply('You do not have this item in your inventory.');
    }

    const item = userInventory[itemIndex];
    if (item.roleRequired) {
      const roleRequired = this.client.util.getRole(msg, item.roleRequired);
      if (roleRequired) {
        // Check if the member has the role
        const hasRole = msg.member.roles.cache.has(roleRequired.id);
        if (!hasRole) {
          return msg.reply(`You do not have the required role **${roleRequired.name}** to use this item.`);
        }
      } else {
        return msg.reply('The required role no longer exists, please contact a server administrator to use this item.');
      }
    }

    const itemAmount = item.quantity - quantity;

    if (itemAmount < 0) {
      return msg.reply(`You only have ${item.quantity} of this item in your inventory.`);
    }

    item.quantity -= quantity;
    let filteredInventory = userInventory;

    if (!item.quantity || item.quantity < 1) {
      delete userInventory[itemIndex];
      // Remove null values
      filteredInventory = await userInventory.filter((item) => item != null);
    }

    await db.set(`servers.${msg.guild.id}.users.${msg.author.id}.economy.inventory`, filteredInventory);

    if (item.roleGiven) {
      const roleGiven = this.client.util.getRole(msg, item.roleGiven);
      await msg.member.roles.add(roleGiven).catch((error) => msg.channel.send(error));
    }
    if (item.roleRemoved) {
      const roleRemoved = this.client.util.getRole(msg, item.roleRemoved);
      await msg.member.roles.remove(roleRemoved).catch((error) => msg.channel.send(error));
    }
    if (!item.replyMessage) {
      return msg.channel.send('👍');
    }

    // Replace Member
    const memberCreatedAt = moment(msg.author.createdAt);
    const memberCreated = memberCreatedAt.format('D MM YY');
    const memberCreatedDuration = memberCreatedAt.from(moment(), true);
    let replyMessage = item.replyMessage
      .replace('{member.id}', msg.author.id)
      .replace('{member.username}', msg.author.username)
      .replace('{member.tag}', msg.author.tag)
      .replace('{member.mention}', msg.author)
      .replace('{member.created}', memberCreated)
      .replace('{member.created.duration}', memberCreatedDuration);

    // Replace Server
    const guildCreatedAt = moment(msg.guild.createdAt);
    const serverCreated = guildCreatedAt.format('D MM YY');
    const serverCreatedDuration = guildCreatedAt.from(moment(), true);

    replyMessage = replyMessage
      .replace('{server.id}', msg.guild.id)
      .replace('{server.name}', msg.guild.name)
      .replace('{server.members}', msg.guild.memberCount.toLocaleString())
      .replace('{server.created}', serverCreated)
      .replace('{servers.created.duration', serverCreatedDuration);

    const role =
      this.client.util.getRole(msg, item.roleGiven) ||
      this.client.util.getRole(msg, item.roleRemoved) ||
      this.client.util.getRole(msg, item.roleRequired);

    if (role) {
      const roleCreatedAt = moment(role.createdAt);
      const roleCreated = roleCreatedAt.format('D MM YY');
      const roleCreatedDuration = roleCreatedAt.from(moment(), true);

      replyMessage = replyMessage
        .replace('{role.id}', role.id)
        .replace('{role.name}', role.name)
        .replace('{role.mention}', role)
        .replace('{role.members}', role.members.size.toLocaleString())
        .replace('{role.created}', roleCreated)
        .replace('{role.created.duration}', roleCreatedDuration);
    }
    return msg.channel.send(replyMessage);
  }
}

module.exports = UseItem;
