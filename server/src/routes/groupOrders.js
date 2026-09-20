const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const router = express.Router();

function generateGroupCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FMX-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/group-orders - Create a new group order session
router.post('/', (req, res) => {
  try {
    const { restaurant_id, host_name, spending_limit, payment_mode } = req.body;
    const restaurant = db.findById('restaurants', restaurant_id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    let code = generateGroupCode();
    while (db.findOne('group_orders', g => g.code === code && g.status === 'active')) {
      code = generateGroupCode();
    }

    const hostParticipantId = `part_${uuidv4().slice(0, 8)}`;
    const groupOrder = db.insert('group_orders', {
      code,
      restaurant_id,
      restaurant_name: restaurant.name,
      restaurant_logo: restaurant.logo_url,
      host_name: host_name || 'Host',
      spending_limit: Number(spending_limit) || 0,
      payment_mode: payment_mode || 'host_pays',
      status: 'active',
      participants: [
        {
          id: hostParticipantId,
          name: `${host_name || 'Host'} (Host)`,
          is_host: true,
          items: []
        }
      ]
    });

    res.json({
      success: true,
      data: groupOrder,
      host_participant_id: hostParticipantId,
      message: 'Group order created! Share the code or link with friends.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to start group order' });
  }
});

// GET /api/group-orders/:code - Get group order details
router.get('/:code', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const group = db.findOne('group_orders', g => g.code === code);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group order not found or expired' });
    }

    let totalItems = 0;
    let subtotal = 0;
    const enrichedParticipants = (group.participants || []).map(p => {
      const pSubtotal = (p.items || []).reduce((sum, item) => sum + (item.price * item.qty), 0);
      const pItemsCount = (p.items || []).reduce((sum, item) => sum + item.qty, 0);
      totalItems += pItemsCount;
      subtotal += pSubtotal;
      return {
        ...p,
        subtotal: pSubtotal,
        items_count: pItemsCount
      };
    });

    res.json({
      success: true,
      data: {
        ...group,
        participants: enrichedParticipants,
        total_items: totalItems,
        subtotal
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve group order' });
  }
});

// POST /api/group-orders/:code/join - Join group order as participant
router.post('/:code/join', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Your name is required to join' });
    }

    const group = db.findOne('group_orders', g => g.code === code);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group order not found' });
    }
    if (group.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This group order is already locked or completed' });
    }

    const participantId = `part_${uuidv4().slice(0, 8)}`;
    const newParticipant = {
      id: participantId,
      name: name.trim(),
      is_host: false,
      items: []
    };

    const updatedParticipants = [...(group.participants || []), newParticipant];
    const updated = db.update('group_orders', group.id, { participants: updatedParticipants });

    if (global.broadcast) {
      global.broadcast({ type: 'GROUP_ORDER_UPDATED', code, data: updated });
    }

    res.json({
      success: true,
      data: updated,
      participant_id: participantId,
      message: `Welcome ${name}! You've joined the group order.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to join group order' });
  }
});

// POST /api/group-orders/:code/items - Add item for a participant
router.post('/:code/items', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { participant_id, item } = req.body;

    const group = db.findOne('group_orders', g => g.code === code);
    if (!group) return res.status(404).json({ success: false, message: 'Group order not found' });
    if (group.status !== 'active') return res.status(400).json({ success: false, message: 'Group order is locked' });

    const participants = [...(group.participants || [])];
    const pIdx = participants.findIndex(p => p.id === participant_id);
    if (pIdx === -1) {
      return res.status(404).json({ success: false, message: 'Participant not found in group' });
    }

    const participant = participants[pIdx];
    const currentItems = [...(participant.items || [])];

    const existingIdx = currentItems.findIndex(i =>
      i.id === item.id &&
      i.selectedSize === item.selectedSize &&
      JSON.stringify(i.selectedExtras || []) === JSON.stringify(item.selectedExtras || [])
    );

    if (existingIdx >= 0) {
      currentItems[existingIdx] = {
        ...currentItems[existingIdx],
        qty: currentItems[existingIdx].qty + (item.qty || 1)
      };
    } else {
      currentItems.push({
        ...item,
        group_item_id: `gi_${uuidv4().slice(0, 8)}`,
        qty: item.qty || 1
      });
    }

    participants[pIdx] = { ...participant, items: currentItems };
    const updated = db.update('group_orders', group.id, { participants });

    if (global.broadcast) {
      global.broadcast({ type: 'GROUP_ORDER_UPDATED', code, data: updated });
    }

    res.json({ success: true, data: updated, message: 'Item added to group basket' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add item' });
  }
});

// DELETE /api/group-orders/:code/items/:groupItemId - Remove an item from group order
router.delete('/:code/items/:groupItemId', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { groupItemId } = req.params;

    const group = db.findOne('group_orders', g => g.code === code);
    if (!group) return res.status(404).json({ success: false, message: 'Group order not found' });

    const participants = (group.participants || []).map(p => ({
      ...p,
      items: (p.items || []).filter(item => item.group_item_id !== groupItemId)
    }));

    const updated = db.update('group_orders', group.id, { participants });

    if (global.broadcast) {
      global.broadcast({ type: 'GROUP_ORDER_UPDATED', code, data: updated });
    }

    res.json({ success: true, data: updated, message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
});

// POST /api/group-orders/:code/checkout - Lock group order and convert to cart items
router.post('/:code/checkout', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const group = db.findOne('group_orders', g => g.code === code);
    if (!group) return res.status(404).json({ success: false, message: 'Group order not found' });

    const consolidatedItems = [];
    (group.participants || []).forEach(p => {
      (p.items || []).forEach(item => {
        consolidatedItems.push({
          ...item,
          participant_name: p.name,
          participant_id: p.id
        });
      });
    });

    if (consolidatedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Group basket is empty! Add items first.' });
    }

    const updated = db.update('group_orders', group.id, { status: 'locked' });

    if (global.broadcast) {
      global.broadcast({ type: 'GROUP_ORDER_LOCKED', code, data: updated });
    }

    res.json({
      success: true,
      data: {
        ...updated,
        consolidated_items: consolidatedItems,
        total_items: consolidatedItems.reduce((s, i) => s + i.qty, 0),
        subtotal: consolidatedItems.reduce((s, i) => s + (i.price * i.qty), 0)
      },
      message: 'Group order locked and ready for checkout!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to lock group order' });
  }
});

module.exports = router;
