/**
 * @file CardEditorController.svelte.ts
 * @module editor
 * @description
 * The Controller for the CardEditorPanel component.
 * This class encapsulates the complex UI logic for the card editor, including:
 * - Managing local state for drag-and-drop operations (sequencing cards).
 * - Handling DOM interactions like scrolling to new cards.
 * - Debouncing updates to prevent database thrashing.
 * - Providing a clean API for the view (`CardEditorPanel.svelte`) to bind to.
 */

import { tick } from 'svelte';
import { cardEditorState, updateCard, addCard as addCardToStore, deleteCard, restoreCard, close } from './cardEditorStore.svelte';
import { debounce } from '$lib/core/utils/debounce';
import type { SRS } from '$lib/types';
import { toast } from 'svelte-sonner';
import { i18n } from '$lib/utils/i18n.svelte';

type Card = SRS.Card;
type CardType = Card['type'];

export class CardEditorController {
    // --- State (Runes) ---
    /** The index of the item currently being dragged (for sequencing cards). */
    draggedItemIndex = $state<number | null>(null);
    /** The index of the potential drop target (for visual feedback). */
    dropTargetIndex = $state<number | null>(null);
    /** Whether the "Add Card" dropdown menu is visible. */
    showAddMenu = $state(false);
    
    // --- Internal Properties ---
    /** Map of card IDs to their DOM elements, used for auto-scrolling. */
    cardElements = new Map<string, HTMLElement>();
    /** Registry of debounced update functions, one per card ID, to ensure independent throttling. */
    private updateHandlers = new Map<string, (card: Card) => void>();

    constructor() {
        // Effect: Watch for a new card being added and scroll it into view.
        $effect(() => {
            const newCardId = cardEditorState.lastAddedCardId;
            if (newCardId) {
                this.scrollToCard(newCardId);
            }
        });
    }

    // --- DOM Management ---

    /**
     * Svelte action to register a card's DOM element.
     * @param node - The HTMLElement of the card.
     * @param id - The unique ID of the card.
     */
    registerElement(node: HTMLElement, id: string) {
        this.cardElements.set(id, node);
        return {
            destroy: () => {
                this.cardElements.delete(id);
            },
        };
    }

    /**
     * Scrolls the viewport to the specified card and focuses its first input.
     * @param cardId - The ID of the target card.
     */
    async scrollToCard(cardId: string) {
        await tick(); // Wait for DOM updates to complete
        const element = this.cardElements.get(cardId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Attempt to auto-focus the first editable field for better UX
            const firstInput = element.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    // --- CRUD Operations ---

    /**
     * Updates a card's data with debouncing to reduce write operations.
     * @param card - The updated card object.
     */
    handleUpdate(card: Card) {
        let handler = this.updateHandlers.get(card.id);
        if (!handler) {
            // Create a dedicated debounced handler for this specific card
            handler = debounce((c: Card) => updateCard(c), 500);
            this.updateHandlers.set(card.id, handler);
        }
        handler(card);
    }

    /**
     * Adds a new card of the specified type.
     * @param type - The type of card to create (e.g., 'basic', 'input').
     */
    handleAddCard(type: CardType) {
        addCardToStore(type);
        this.showAddMenu = false;
    }

    /**
     * Removes a card and shows a toast with an Undo option.
     * @param cardId - The ID of the card to remove.
     */
    async handleRemoveCard(cardId: string) {
        const deletedCard = await deleteCard(cardId);
        if (deletedCard) {
            toast.success(i18n.t('card_editor_panel.card_deleted_toast'), {
                action: {
                    label: i18n.t('card_editor_panel.undo_button'),
                    onClick: () => restoreCard(deletedCard),
                },
            });
        }
    }

    /**
     * Adds a new item to a sequencing card's list.
     * @param card - The sequencing card to modify.
     */
    addSequenceItem(card: Card) {
        if (card.type === 'sequencing') {
            card.content.items = [...card.content.items, ''];
            this.handleUpdate(card);
        }
    }

    /**
     * Removes an item from a sequencing card's list.
     * @param card - The sequencing card to modify.
     * @param itemIndex - The index of the item to remove.
     */
    removeSequenceItem(card: Card, itemIndex: number) {
        if (card.type === 'sequencing') {
            card.content.items = card.content.items.filter((_, i) => i !== itemIndex);
            this.handleUpdate(card);
        }
    }

    // --- Drag and Drop Logic (Sequencing Cards) ---

    handleDragStart(index: number, event: DragEvent) {
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        this.draggedItemIndex = index;
    }

    handleDragOver(targetIndex: number, event: DragEvent) {
        event.preventDefault(); // Necessary to allow dropping
        if (this.draggedItemIndex !== targetIndex) {
            this.dropTargetIndex = targetIndex;
        }
    }

    handleDrop(targetIndex: number, card: Card) {
        if (
            card.type !== 'sequencing' ||
            this.draggedItemIndex === null ||
            this.draggedItemIndex === targetIndex
        ) {
            this.resetDragState();
            return;
        }

        // Reorder the items array
        const newItems = [...card.content.items];
        const [draggedItem] = newItems.splice(this.draggedItemIndex, 1);
        newItems.splice(targetIndex, 0, draggedItem);

        card.content.items = newItems;
        this.handleUpdate(card);
        this.resetDragState();
    }

    resetDragState() {
        this.draggedItemIndex = null;
        this.dropTargetIndex = null;
    }

    // --- Navigation ---

    closePanel() {
        close();
    }
}
