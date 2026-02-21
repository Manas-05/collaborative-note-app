import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchNotes = createAsyncThunk('notes/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/notes');
    return data.notes;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

export const fetchNote = createAsyncThunk('notes/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/notes/${id}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

export const createNote = createAsyncThunk('notes/create', async (noteData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/notes', noteData);
    return data.note;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

export const updateNote = createAsyncThunk('notes/update', async ({ id, ...updates }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/notes/${id}`, updates);
    return data.note;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

export const deleteNote = createAsyncThunk('notes/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/notes/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

const notesSlice = createSlice({
  name: 'notes',
  initialState: {
    list: [],
    currentNote: null,
    collaborators: [],
    loading: false,
    error: null,
  },
  reducers: {
    updateNoteRealtime: (state, action) => {
      const { noteId, title, content } = action.payload;
      const note = state.list.find(n => n.id === noteId);
      if (note) {
        if (title !== undefined) note.title = title;
        if (content !== undefined) note.content = content;
      }
      if (state.currentNote?.id === noteId) {
        if (title !== undefined) state.currentNote.title = title;
        if (content !== undefined) state.currentNote.content = content;
      }
    },
    clearCurrentNote: (state) => { state.currentNote = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotes.pending, (state) => { state.loading = true; })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchNote.fulfilled, (state, action) => {
        state.currentNote = action.payload.note;
        state.collaborators = action.payload.collaborators;
      })
      .addCase(createNote.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        const idx = state.list.findIndex(n => n.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
        if (state.currentNote?.id === action.payload.id) {
          state.currentNote = action.payload;
        }
      })
      .addCase(deleteNote.fulfilled, (state, action) => {
        state.list = state.list.filter(n => n.id !== action.payload);
      });
  },
});

export const { updateNoteRealtime, clearCurrentNote } = notesSlice.actions;
export default notesSlice.reducer;