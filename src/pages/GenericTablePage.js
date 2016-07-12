/* @flow weak */

/**
 * mSupply Mobile
 * Sustainable Solutions (NZ) Ltd. 2016
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import globalStyles, { SUSSOL_ORANGE, WARM_GREY, WARMER_GREY } from '../globalStyles';

import {
  Cell,
  CheckableCell,
  DataTable,
  EditableCell,
  Header,
  HeaderCell,
  Row,
} from '../widgets/DataTable';

import Icon from 'react-native-vector-icons/Ionicons';
import { ListView } from 'realm/react-native';
import { SearchBar } from '../widgets';

/**
 * Provides a generic implementation of a standard page in mSupply Mobile, which
 * contains a searchable table. Should always be overridden, in particular the
 * following methods and instance variables (fields):
 * @method getUpdatedData(searchTerm, sortBy, isAscending) Should return updated data
 * @method renderCell(key, item) Should define what to render in a cell with the
 *         											 given column key and database item
 * @method onRowPress(key, item) Should define behaviour when a row is pressed,
 *         											 don't override if row should not be pressable
 * @method onEndEditing(key, item, newValue) Handles user input to an editable cell
 *         											 don't override if row should not be pressable
 * @field  {array}  columns      An array of objects defining each of the columns.
 *         											 Each column must contain: key, width, title. Each
 *         											 may optionally also contain a boolean 'sortable'.
 * @state  {ListView.DataSource} dataSource    DataTable input, used to update rows
 *         																		 being rendered
 * @state  {string}              searchTerm    Current term user has entered in search bar
 * @state  {string}              sortBy        The property to sort by (is selected
 *                                             by column press).
 * @state  {boolean}             isAscending   Direction sortBy should sort
 *                                             (ascending/descending:true/false).
 * N.B. Take care to call parent method if overriding any of the react life cycle methods.
 */
export class GenericTablePage extends React.Component {
  constructor(props) {
    super(props);
    const dataSource = new ListView.DataSource({
      getRowData: (data, sectionId, rowId) => data[sectionId][this.rowIds.indexOf(rowId)],
      rowHasChanged: (row1, row2) => row1 !== row2,
    });
    this.state = {
      dataSource: dataSource,
      searchTerm: '',
      sortBy: '',
      isAscending: true,
      selection: [],
    };
    this.rowIds = [];
    this.columns = null;
    this.dataTypesDisplayed = [];
    this.databaseListenerId = null;
    this.onSearchChange = this.onSearchChange.bind(this);
    this.onColumnSort = this.onColumnSort.bind(this);
    this.onDatabaseEvent = this.onDatabaseEvent.bind(this);
    this.renderHeader = this.renderHeader.bind(this);
    this.renderRow = this.renderRow.bind(this);
    this.renderCell = this.renderCell.bind(this);
    this.refreshData = this.refreshData.bind(this);
  }


  /**
   * If overridden, first line of this method should be duplicated. May need to be overridden to
   * populate selection in state if CheckableCells are used and need to
   * remember their selected state.
   */
  componentWillMount() {
    this.databaseListenerId = this.props.database.addListener(this.onDatabaseEvent);
    this.refreshData();
  }

  componentWillUnmount() {
    this.props.database.removeListener(this.databaseListenerId);
  }

  onDatabaseEvent(changeType, recordType) {
    if (this.dataTypesDisplayed.indexOf(recordType) >= 0) this.refreshData();
  }

  onSearchChange(event) {
    const term = event.nativeEvent.text;
    this.setState({ searchTerm: term }, this.refreshData);
  }

  onColumnSort(sortBy) {
    if (this.state.sortBy === sortBy) { // Changed column sort direction
      this.setState({ isAscending: !this.state.isAscending }, this.refreshData);
    } else { // Changed sorting column
      this.setState({
        sortBy: sortBy,
        isAscending: true,
      }, this.refreshData);
    }
  }

  /**
   * Adds/removes item.id to/from the selection array in state. Must call this within any overrides.
   * i.e. super.onCheckablePress(item);
   */
  onCheckablePress(item) {
    const newSelection = [...this.state.selection];
    if (newSelection.indexOf(item.id) >= 0) {
      newSelection.splice(newSelection.indexOf(item.id), 1);
    } else {
      newSelection.push(item.id);
    }
    this.setState({ selection: newSelection });
  }

  refreshData() {
    const { dataSource, searchTerm, sortBy, isAscending } = this.state;
    const data = this.getUpdatedData(searchTerm, sortBy, isAscending);
    this.rowIds = data.map(rowData => rowData.id);
    this.setState({ dataSource: dataSource.cloneWithRows(data, this.rowIds) });
  }

/**
 * Accepted Cell formats:
 * 1. <Cell style={styles.cell} width={3}/> // Or any other react component. Must be styled within
 *                                          // the extending class.
 * 2. item.name;
 * 3. {
 *      type: 'text',
 *      cellContents: item.name,
 *    };
 * 4. {
 *      type: 'editable',
 *      cellContents: transactionItem.totalQuantity,
 *    };
 * 5. {
 *      type: 'checkable',
 *      isDisabled: false,
 *    };
 * 6. {
 *      type: 'checkable',
 *      icon: 'md-remove-circle', // will use for both Checked and NotChecked, only colour changes
 *      isDisabled: false,
 *    };
 * 7. {
 *      type: 'checkable',
 *      iconChecked: 'md-radio-button-on',
 *      iconNotChecked: 'md-radio-button-off',
 *      isDisabled: false,
 *    };
 */
  renderCell() {
    return 'DEFAULT CELL';
  }

  renderHeader() {
    const headerCells = [];
    this.columns.forEach((column) => {
      const sortFunction = column.sortable ? () => this.onColumnSort(column.key) : null;
      headerCells.push(
        <HeaderCell
          key={column.key}
          style={globalStyles.dataTableHeaderCell}
          textStyle={globalStyles.dataTableText}
          width={column.width}
          onPress={sortFunction}
          isAscending={this.state.isAscending}
          isSelected={this.state.sortBy === column.key}
          text={column.title}
        />
      );
    });
    return (
      <Header style={globalStyles.header}>
        {headerCells}
      </Header>
    );
  }

  renderRow(item, sectionId, rowId) {
    console.log(`sectionId is ${sectionId}, rowId is ${rowId}`);
    const cells = [];
    this.columns.forEach((column) => {
      const renderedCell = this.renderCell(column.key, item);
      let cell;
      switch (renderedCell.type) {
        case 'custom':
          cell = renderedCell.cell;
          break;
        case 'checkable': {
          // if provided, use isChecked prop, else set isChecked according to item.id
          // being in selection array.
          const isChecked = renderedCell.isChecked ?
            renderedCell.isChecked : this.state.selection.indexOf(item.id) >= 0;
          let iconChecked;
          let iconNotChecked;
          if (renderedCell.iconChecked && renderedCell.iconNotChecked) {
            iconChecked = renderedCell.iconChecked;
            iconNotChecked = renderedCell.iconNotChecked;
          } else if (renderedCell.icon) {
            iconChecked = renderedCell.icon;
            iconNotChecked = renderedCell.icon;
          } else {
            iconChecked = 'md-radio-button-on';
            iconNotChecked = 'md-radio-button-off';
          }
          cell = (
            <CheckableCell
              key={column.key}
              style={[
                globalStyles.dataTableCell,
                globalStyles.dataTableCheckableCell,
              ]}
              width={column.width}
              onPress={() => this.onCheckablePress(item)}
              renderDisabled={() => <Icon name={iconNotChecked} size={15} color={WARMER_GREY} />}
              renderIsChecked={() => <Icon name={iconChecked} size={15} color={SUSSOL_ORANGE} />}
              renderIsNotChecked={() => <Icon name={iconNotChecked} size={15} color={WARM_GREY} />}
              isChecked={isChecked}
              isDisabled={renderedCell.isDisabled}
            />
          );
          break;
        }
        case 'editable':
          cell = (
            <EditableCell
              key={column.key}
              style={globalStyles.dataTableCell}
              textStyle={globalStyles.dataTableText}
              width={column.width}
              onEndEditing={this.onEndEditing &&
                            ((target, value) => this.onEndEditing(column.key, target, value))}
              target={item}
              value={renderedCell.cellContents}
            />
          );
          break;
        case 'text':
        default:
          cell = (
            <Cell
              key={column.key}
              style={globalStyles.dataTableCell}
              textStyle={globalStyles.dataTableText}
              width={column.width}
            >
              {renderedCell.hasOwnProperty('cellContents') ?
                renderedCell.cellContents :
                renderedCell}
            </Cell>
          );
      }
      cells.push(cell);
    });
    return (
      <Row
        style={globalStyles.dataTableRow}
        onPress={this.onRowPress && (() => this.onRowPress(item))}
      >
        {cells}
      </Row>
    );
  }

  renderSearchBar() {
    return (
      <SearchBar
        onChange={(event) => this.onSearchChange(event)}
      />);
  }

  renderDataTable() {
    return (
      <DataTable
        style={globalStyles.dataTable}
        listViewStyle={localStyles.listView}
        dataSource={this.state.dataSource}
        renderRow={this.renderRow}
        renderHeader={this.renderHeader}
      />);
  }

  render() {
    return (
      <View style={globalStyles.pageContentContainer}>
        <View style={globalStyles.container}>
          <View style={globalStyles.pageTopSectionContainer}>
            {this.renderSearchBar()}
          </View>
          {this.renderDataTable()}
        </View>
      </View>
    );
  }
}

GenericTablePage.propTypes = {
  database: React.PropTypes.object,
};

const localStyles = StyleSheet.create({
  listView: {
    flex: 1,
  },
  rightMostCell: {
    borderRightWidth: 0,
  },
  dataTable: {
    flex: 1,
  },
});
