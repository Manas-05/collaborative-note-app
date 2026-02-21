import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const searchNotes = createAsyncThunk('search/search', async (query, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
    return data.results;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

const searchSlice = createSlice({
  name: 'search',
  initialState: { results: [], loading: false, query: '' },
  reducers: {
    clearSearch: (state) => { state.results = []; state.query = ''; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchNotes.pending, (state) => { state.loading = true; })
      .addCase(searchNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload;
      })
      .addCase(searchNotes.rejected, (state) => { state.loading = false; });
  },
});

export const { clearSearch } = searchSlice.actions;
export default searchSlice.reducer;